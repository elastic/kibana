/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../library', () => {
  const actual = jest.requireActual('../../../library');
  return {
    ...actual,
    LibraryService: jest.fn(),
  };
});

import type { Logger } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { WORKFLOWS_LIBRARY_ENABLED_SETTING_ID } from '@kbn/workflows';
import { parseTemplateYaml } from '@kbn/workflows-library';
import { WorkflowValidationError } from '@kbn/workflows-yaml';

import { registerLibraryRoutes } from '.';
import { LibraryFetchError, LibraryNotFoundError, LibraryService } from '../../../library';
import {
  LIBRARY_CATALOG_FAILED_EVENT_TYPE,
  TEMPLATE_INSTALLED_EVENT_TYPE,
  TEMPLATE_LOAD_FAILED_EVENT_TYPE,
} from '../../../library/telemetry/events';
import type { RouteDependencies } from '../types';

const TEMPLATES_PATH = '/internal/workflows/library/templates';
const TEMPLATE_PATH = '/internal/workflows/library/templates/{slug}';
const INSTALL_PATH = '/internal/workflows/library/templates/{slug}/install';
const INSTALL_FROM_YAML_PATH = '/internal/workflows/library/templates/install';
const REMIX_PATH = '/internal/workflows/library/templates/{slug}/remix';
const HEALTH_PATH = '/internal/workflows/library/health';

const INSTALLABLE_TEMPLATE = parseTemplateYaml(`template-metadata:
  slug: demo
  version: "1.0.0"
  availability: ">=9.5.0"
  name: "Demo"
  description: "Demo template."
  categories: [utility]
  install:
    form:
      - name: demo-connector
        inputType: connector
        connectorType: .demo
        required: true
steps:
  - name: demo_step
    type: demo.run
    connector-id: __install__.demo-connector
`);

const MockedLibraryService = LibraryService as jest.MockedClass<typeof LibraryService>;

describe('Library Routes', () => {
  type MockRouteHandler = (
    context: typeof mockContext,
    request: ReturnType<typeof httpServerMock.createKibanaRequest>,
    response: ReturnType<typeof httpServerMock.createResponseFactory>
  ) => Promise<unknown>;

  let routeHandlers: Record<string, { handler: MockRouteHandler }>;
  let mockLibraryService: {
    listTemplates: jest.Mock;
    getCachedTemplates: jest.Mock;
    getTemplate: jest.Mock;
    getHealth: jest.Mock;
  };
  let mockGlobalUiSettings: { get: jest.Mock };
  let mockApi: { createWorkflow: jest.Mock };
  let mockSpaces: { getSpaceId: jest.Mock };
  let mockAudit: { logWorkflowCreated: jest.Mock; logWorkflowCreateFailed: jest.Mock };
  let mockAnalytics: { reportEvent: jest.Mock };

  const setToggle = (value: boolean) => mockGlobalUiSettings.get.mockResolvedValue(value);

  const mockContext = {
    workflows: Promise.resolve({ isWorkflowsAvailable: true }),
    licensing: Promise.resolve({
      license: {
        isAvailable: true,
        isActive: true,
        hasAtLeast: jest.fn().mockReturnValue(true),
        type: 'enterprise',
      },
    }),
    core: Promise.resolve({
      uiSettings: {
        get globalClient() {
          return mockGlobalUiSettings;
        },
      },
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    routeHandlers = {};
    mockLibraryService = {
      listTemplates: jest.fn(),
      getCachedTemplates: jest.fn(),
      getTemplate: jest.fn(),
      getHealth: jest.fn().mockReturnValue({ sourceMode: 'http', lastRefreshAt: null }),
    };
    mockGlobalUiSettings = { get: jest.fn().mockResolvedValue(true) };
    mockApi = { createWorkflow: jest.fn() };
    mockSpaces = { getSpaceId: jest.fn().mockReturnValue('default') };
    mockAudit = { logWorkflowCreated: jest.fn(), logWorkflowCreateFailed: jest.fn() };
    mockAnalytics = { reportEvent: jest.fn() };

    MockedLibraryService.mockImplementation(() => mockLibraryService as unknown as LibraryService);

    const createVersionedRoute = (method: string, path: string) => ({
      addVersion: jest.fn().mockImplementation((_config: unknown, handler: MockRouteHandler) => {
        routeHandlers[`${method}:${path}`] = { handler };
        return { addVersion: jest.fn() };
      }),
    });

    const mockRouter = {
      versioned: {
        get: jest
          .fn()
          .mockImplementation((config: { path: string }) =>
            createVersionedRoute('GET', config.path)
          ),
        post: jest
          .fn()
          .mockImplementation((config: { path: string }) =>
            createVersionedRoute('POST', config.path)
          ),
      },
    };

    const logger: Logger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      get: jest.fn().mockReturnThis(),
    } as unknown as Logger;

    const routeDependencies: RouteDependencies = {
      router: mockRouter,
      config: {
        library: { ttlMs: 600_000 },
      },
      workflowsService: {
        kibanaVersion: '9.5.0',
        plugins: { serverless: undefined },
      },
      logger,
      api: mockApi,
      spaces: mockSpaces,
      audit: mockAudit,
      analytics: mockAnalytics,
    } as unknown as RouteDependencies;

    registerLibraryRoutes(routeDependencies);
  });

  describe('route registration', () => {
    it('should register the templates route handler', () => {
      expect(routeHandlers[`GET:${TEMPLATES_PATH}`]).toBeDefined();
      expect(routeHandlers[`GET:${TEMPLATES_PATH}`].handler).toEqual(expect.any(Function));
    });

    it('should register the single-template route handler', () => {
      expect(routeHandlers[`GET:${TEMPLATE_PATH}`]).toBeDefined();
      expect(routeHandlers[`GET:${TEMPLATE_PATH}`].handler).toEqual(expect.any(Function));
    });

    it('should register the install route handler', () => {
      expect(routeHandlers[`POST:${INSTALL_PATH}`]).toBeDefined();
      expect(routeHandlers[`POST:${INSTALL_PATH}`].handler).toEqual(expect.any(Function));
    });

    it('should register the library health route handler', () => {
      expect(routeHandlers[`GET:${HEALTH_PATH}`]).toBeDefined();
      expect(routeHandlers[`GET:${HEALTH_PATH}`].handler).toEqual(expect.any(Function));
    });

    it('should construct a single LibraryService for the three routes', () => {
      expect(MockedLibraryService).toHaveBeenCalledTimes(1);
    });
  });

  describe(`GET ${TEMPLATES_PATH}`, () => {
    it('should pass query filters to the service and return 200 with the templates', async () => {
      setToggle(true);
      mockLibraryService.listTemplates.mockResolvedValue([{ slug: 'demo' }]);

      const response = httpServerMock.createResponseFactory();
      const request = httpServerMock.createKibanaRequest({
        query: { solution: 'security', category: 'enrichment' },
      });

      await routeHandlers[`GET:${TEMPLATES_PATH}`].handler(mockContext, request, response);

      expect(mockGlobalUiSettings.get).toHaveBeenCalledWith(WORKFLOWS_LIBRARY_ENABLED_SETTING_ID);
      expect(mockLibraryService.listTemplates).toHaveBeenCalledWith({
        solution: 'security',
        category: 'enrichment',
      });
      expect(response.ok).toHaveBeenCalledWith({ body: { templates: [{ slug: 'demo' }] } });
    });

    it('should short-circuit with 503 when the toggle is off and not call the service', async () => {
      setToggle(false);

      const response = httpServerMock.createResponseFactory();

      await routeHandlers[`GET:${TEMPLATES_PATH}`].handler(
        mockContext,
        httpServerMock.createKibanaRequest(),
        response
      );

      expect(mockLibraryService.listTemplates).not.toHaveBeenCalled();
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 503,
        body: { message: expect.stringMatching(/disabled/i) },
      });
    });

    it('should map a LibraryFetchError to 503 with the underlying message', async () => {
      setToggle(true);
      mockLibraryService.listTemplates.mockRejectedValue(
        new LibraryFetchError('Catalog not ready', 'unavailable')
      );

      const response = httpServerMock.createResponseFactory();

      await routeHandlers[`GET:${TEMPLATES_PATH}`].handler(
        mockContext,
        httpServerMock.createKibanaRequest(),
        response
      );

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 503,
        body: { message: 'Catalog not ready' },
      });
    });

    it('should map an unexpected error to 500 via the error mapper', async () => {
      setToggle(true);
      mockLibraryService.listTemplates.mockRejectedValue(new Error('boom'));

      const response = httpServerMock.createResponseFactory();

      await routeHandlers[`GET:${TEMPLATES_PATH}`].handler(
        mockContext,
        httpServerMock.createKibanaRequest(),
        response
      );

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: expect.stringContaining('boom') },
      });
    });
  });

  describe(`GET ${TEMPLATE_PATH}`, () => {
    it('should pass the slug to the service and return 200 with the body', async () => {
      setToggle(true);
      const body = { metadata: { slug: 'demo' }, raw: 'yaml' };
      mockLibraryService.getTemplate.mockResolvedValue(body);

      const response = httpServerMock.createResponseFactory();
      const request = httpServerMock.createKibanaRequest({ params: { slug: 'demo' } });

      await routeHandlers[`GET:${TEMPLATE_PATH}`].handler(mockContext, request, response);

      expect(mockLibraryService.getTemplate).toHaveBeenCalledWith('demo');
      expect(response.ok).toHaveBeenCalledWith({ body });
    });

    it('should map LibraryNotFoundError to 404', async () => {
      setToggle(true);
      mockLibraryService.getTemplate.mockRejectedValue(new LibraryNotFoundError('missing'));

      const response = httpServerMock.createResponseFactory();
      const request = httpServerMock.createKibanaRequest({ params: { slug: 'missing' } });

      await routeHandlers[`GET:${TEMPLATE_PATH}`].handler(mockContext, request, response);

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: expect.stringContaining('"missing"') },
      });
    });

    it('should short-circuit with 503 when the toggle is off', async () => {
      setToggle(false);

      const response = httpServerMock.createResponseFactory();
      const request = httpServerMock.createKibanaRequest({ params: { slug: 'demo' } });

      await routeHandlers[`GET:${TEMPLATE_PATH}`].handler(mockContext, request, response);

      expect(mockLibraryService.getTemplate).not.toHaveBeenCalled();
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 503,
        body: { message: expect.any(String) },
      });
    });
  });

  describe(`POST ${INSTALL_PATH}`, () => {
    const installRequest = (values: Record<string, unknown> = {}) =>
      httpServerMock.createKibanaRequest({
        params: { slug: 'demo' },
        body: { values },
      });

    it('should render the template and create a workflow through the shared create path', async () => {
      setToggle(true);
      mockLibraryService.getTemplate.mockResolvedValue(INSTALLABLE_TEMPLATE);
      mockApi.createWorkflow.mockResolvedValue({ id: 'wf-1' });

      const response = httpServerMock.createResponseFactory();
      const request = installRequest({ 'demo-connector': 'my-connector-id' });

      await routeHandlers[`POST:${INSTALL_PATH}`].handler(mockContext, request, response);

      expect(mockLibraryService.getTemplate).toHaveBeenCalledWith('demo');
      expect(mockApi.createWorkflow).toHaveBeenCalledWith(
        { yaml: expect.stringContaining('connector-id: my-connector-id') },
        'default',
        request,
        {
          templateOrigin: {
            templateSlug: 'demo',
            templateVersion: '1.0.0',
            templateOrigin: 'install',
          },
        }
      );
      const submittedYaml = mockApi.createWorkflow.mock.calls[0][0].yaml;
      expect(submittedYaml).not.toContain('template-metadata');
      expect(submittedYaml).not.toContain('__install__');
      expect(mockAudit.logWorkflowCreated).toHaveBeenCalledWith(request, { id: 'wf-1' });
      expect(response.ok).toHaveBeenCalledWith({ body: { workflowId: 'wf-1' } });
    });

    it('should return 400 with field-level details when form values are invalid', async () => {
      setToggle(true);
      mockLibraryService.getTemplate.mockResolvedValue(INSTALLABLE_TEMPLATE);

      const response = httpServerMock.createResponseFactory();

      await routeHandlers[`POST:${INSTALL_PATH}`].handler(mockContext, installRequest(), response);

      expect(mockApi.createWorkflow).not.toHaveBeenCalled();
      expect(response.badRequest).toHaveBeenCalledWith({
        body: {
          message: expect.stringContaining('demo-connector'),
          attributes: {
            errors: [{ field: 'demo-connector', reason: 'A value is required.' }],
          },
        },
      });
    });

    it('should return 400 when the body references a field the form does not declare', async () => {
      setToggle(true);
      mockLibraryService.getTemplate.mockResolvedValue(
        parseTemplateYaml(
          INSTALLABLE_TEMPLATE.raw.replace('__install__.demo-connector', '__install__.rogue')
        )
      );

      const response = httpServerMock.createResponseFactory();
      const request = installRequest({ 'demo-connector': 'my-connector-id' });

      await routeHandlers[`POST:${INSTALL_PATH}`].handler(mockContext, request, response);

      expect(mockApi.createWorkflow).not.toHaveBeenCalled();
      expect(response.badRequest).toHaveBeenCalledWith({
        body: {
          message: expect.stringContaining('rogue'),
          attributes: {
            errors: [{ field: 'rogue', reason: expect.stringContaining('not declared') }],
          },
        },
      });
    });

    it('should map LibraryNotFoundError to 404', async () => {
      setToggle(true);
      mockLibraryService.getTemplate.mockRejectedValue(new LibraryNotFoundError('demo'));

      const response = httpServerMock.createResponseFactory();

      await routeHandlers[`POST:${INSTALL_PATH}`].handler(mockContext, installRequest(), response);

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: expect.stringContaining('"demo"') },
      });
    });

    it('should short-circuit with 503 when the toggle is off and not create anything', async () => {
      setToggle(false);

      const response = httpServerMock.createResponseFactory();

      await routeHandlers[`POST:${INSTALL_PATH}`].handler(mockContext, installRequest(), response);

      expect(mockLibraryService.getTemplate).not.toHaveBeenCalled();
      expect(mockApi.createWorkflow).not.toHaveBeenCalled();
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 503,
        body: { message: expect.stringMatching(/disabled/i) },
      });
    });

    it('should audit the failure and map the error when workflow creation fails', async () => {
      setToggle(true);
      mockLibraryService.getTemplate.mockResolvedValue(INSTALLABLE_TEMPLATE);
      const creationError = new Error('creation boom');
      mockApi.createWorkflow.mockRejectedValue(creationError);

      const response = httpServerMock.createResponseFactory();
      const request = installRequest({ 'demo-connector': 'my-connector-id' });

      await routeHandlers[`POST:${INSTALL_PATH}`].handler(mockContext, request, response);

      expect(mockAudit.logWorkflowCreateFailed).toHaveBeenCalledWith(request, creationError);
      expect(mockAudit.logWorkflowCreated).not.toHaveBeenCalled();
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: expect.stringContaining('creation boom') },
      });
    });
  });

  describe(`POST ${INSTALL_FROM_YAML_PATH}`, () => {
    const installFromYamlRequest = (yaml: string, values: Record<string, unknown> = {}) =>
      httpServerMock.createKibanaRequest({ body: { yaml, values } });

    it('should register the route handler', () => {
      expect(routeHandlers[`POST:${INSTALL_FROM_YAML_PATH}`]).toBeDefined();
      expect(routeHandlers[`POST:${INSTALL_FROM_YAML_PATH}`].handler).toEqual(expect.any(Function));
    });

    it('should parse the supplied YAML, render it, and create a workflow through the shared create path', async () => {
      setToggle(true);
      mockLibraryService.listTemplates.mockResolvedValue([{ slug: 'demo', version: '1.0.0' }]);
      mockApi.createWorkflow.mockResolvedValue({ id: 'wf-2' });

      const response = httpServerMock.createResponseFactory();
      const request = installFromYamlRequest(INSTALLABLE_TEMPLATE.raw, {
        'demo-connector': 'my-connector-id',
      });

      await routeHandlers[`POST:${INSTALL_FROM_YAML_PATH}`].handler(mockContext, request, response);

      expect(mockApi.createWorkflow).toHaveBeenCalledWith(
        { yaml: expect.stringContaining('connector-id: my-connector-id') },
        'default',
        request,
        {
          templateOrigin: {
            templateSlug: 'demo',
            templateVersion: '1.0.0',
            templateOrigin: 'import',
          },
        }
      );
      const submittedYaml = mockApi.createWorkflow.mock.calls[0][0].yaml;
      expect(submittedYaml).not.toContain('template-metadata');
      expect(submittedYaml).not.toContain('__install__');
      expect(mockAudit.logWorkflowCreated).toHaveBeenCalledWith(request, { id: 'wf-2' });
      expect(response.ok).toHaveBeenCalledWith({ body: { workflowId: 'wf-2' } });
    });

    it('should store a template that is not in the catalog as custom', async () => {
      setToggle(true);
      mockLibraryService.listTemplates.mockResolvedValue([{ slug: 'another-template' }]);
      mockApi.createWorkflow.mockResolvedValue({ id: 'wf-3' });

      const response = httpServerMock.createResponseFactory();
      const request = installFromYamlRequest(INSTALLABLE_TEMPLATE.raw, {
        'demo-connector': 'my-connector-id',
      });

      await routeHandlers[`POST:${INSTALL_FROM_YAML_PATH}`].handler(mockContext, request, response);

      expect(mockApi.createWorkflow).toHaveBeenCalledWith(expect.anything(), 'default', request, {
        templateOrigin: { templateSlug: 'custom', templateOrigin: 'import' },
      });
      expect(response.ok).toHaveBeenCalledWith({ body: { workflowId: 'wf-3' } });
    });

    it('should still install, as unresolved, when no catalog can be read', async () => {
      setToggle(true);
      mockLibraryService.listTemplates.mockRejectedValue(
        new LibraryFetchError('upstream down', 'unavailable')
      );
      mockApi.createWorkflow.mockResolvedValue({ id: 'wf-4' });

      const response = httpServerMock.createResponseFactory();
      const request = installFromYamlRequest(INSTALLABLE_TEMPLATE.raw, {
        'demo-connector': 'my-connector-id',
      });

      await routeHandlers[`POST:${INSTALL_FROM_YAML_PATH}`].handler(mockContext, request, response);

      expect(mockApi.createWorkflow).toHaveBeenCalledWith(expect.anything(), 'default', request, {
        templateOrigin: { templateSlug: 'unresolved', templateOrigin: 'import' },
      });
      expect(response.ok).toHaveBeenCalledWith({ body: { workflowId: 'wf-4' } });
    });

    it('should return 400 when the supplied YAML is not a valid template', async () => {
      setToggle(true);

      const response = httpServerMock.createResponseFactory();
      const request = installFromYamlRequest('not: a template');

      await routeHandlers[`POST:${INSTALL_FROM_YAML_PATH}`].handler(mockContext, request, response);

      expect(mockApi.createWorkflow).not.toHaveBeenCalled();
      expect(response.badRequest).toHaveBeenCalledWith({
        body: { message: expect.stringContaining('template-metadata') },
      });
    });

    it('should return 400 with field-level details when form values are invalid', async () => {
      setToggle(true);

      const response = httpServerMock.createResponseFactory();
      const request = installFromYamlRequest(INSTALLABLE_TEMPLATE.raw);

      await routeHandlers[`POST:${INSTALL_FROM_YAML_PATH}`].handler(mockContext, request, response);

      expect(mockApi.createWorkflow).not.toHaveBeenCalled();
      expect(response.badRequest).toHaveBeenCalledWith({
        body: {
          message: expect.stringContaining('demo-connector'),
          attributes: {
            errors: [{ field: 'demo-connector', reason: 'A value is required.' }],
          },
        },
      });
    });

    it('should short-circuit with 503 when the toggle is off and not create anything', async () => {
      setToggle(false);

      const response = httpServerMock.createResponseFactory();
      const request = installFromYamlRequest(INSTALLABLE_TEMPLATE.raw, {
        'demo-connector': 'my-connector-id',
      });

      await routeHandlers[`POST:${INSTALL_FROM_YAML_PATH}`].handler(mockContext, request, response);

      expect(mockApi.createWorkflow).not.toHaveBeenCalled();
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 503,
        body: { message: expect.stringMatching(/disabled/i) },
      });
    });

    it('should audit the failure and map the error when workflow creation fails', async () => {
      setToggle(true);
      const creationError = new Error('yaml creation boom');
      mockApi.createWorkflow.mockRejectedValue(creationError);

      const response = httpServerMock.createResponseFactory();
      const request = installFromYamlRequest(INSTALLABLE_TEMPLATE.raw, {
        'demo-connector': 'my-connector-id',
      });

      await routeHandlers[`POST:${INSTALL_FROM_YAML_PATH}`].handler(mockContext, request, response);

      expect(mockAudit.logWorkflowCreateFailed).toHaveBeenCalledWith(request, creationError);
      expect(mockAudit.logWorkflowCreated).not.toHaveBeenCalled();
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: expect.stringContaining('yaml creation boom') },
      });
    });
  });

  describe('telemetry', () => {
    const catalogDemo = { slug: 'demo', version: '1.0.0', solutions: ['security'] };
    const connectorValues = { 'demo-connector': 'my-connector-id' };

    const installFromCatalog = (values: Record<string, unknown> = {}) =>
      routeHandlers[`POST:${INSTALL_PATH}`].handler(
        mockContext,
        httpServerMock.createKibanaRequest({ params: { slug: 'demo' }, body: { values } }),
        httpServerMock.createResponseFactory()
      );

    const installFromFile = (yaml: string, values: Record<string, unknown> = {}) =>
      routeHandlers[`POST:${INSTALL_FROM_YAML_PATH}`].handler(
        mockContext,
        httpServerMock.createKibanaRequest({ body: { yaml, values } }),
        httpServerMock.createResponseFactory()
      );

    beforeEach(() => {
      setToggle(true);
      mockLibraryService.getCachedTemplates.mockReturnValue([catalogDemo]);
      mockLibraryService.listTemplates.mockResolvedValue([catalogDemo]);
    });

    it('reports a catalog failure through the library service listener', () => {
      const [[{ onFailure }]] = MockedLibraryService.mock.calls;
      const failure = { operation: 'catalog', reason: 'timeout', sourceMode: 'http' } as const;

      onFailure?.(failure);

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
        LIBRARY_CATALOG_FAILED_EVENT_TYPE,
        failure
      );
    });

    it('reports a successful install from the catalog', async () => {
      mockLibraryService.getTemplate.mockResolvedValue(INSTALLABLE_TEMPLATE);
      mockApi.createWorkflow.mockResolvedValue({ id: 'wf-1' });

      await installFromCatalog(connectorValues);

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(TEMPLATE_INSTALLED_EVENT_TYPE, {
        success: true,
        source: 'catalog',
        sourceMode: 'http',
        templateSlug: 'demo',
        templateVersion: '1.0.0',
        solutions: ['security'],
        formFieldCount: 1,
        requiredConnectorTypes: ['.demo'],
        workflowId: 'wf-1',
      });
    });

    it('reports the form fields that failed validation on a catalog install', async () => {
      mockLibraryService.getTemplate.mockResolvedValue(INSTALLABLE_TEMPLATE);

      await installFromCatalog();

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
        TEMPLATE_INSTALLED_EVENT_TYPE,
        expect.objectContaining({
          success: false,
          templateSlug: 'demo',
          errorType: 'form_validation',
          invalidFields: ['demo-connector'],
        })
      );
    });

    it('reports a slug that is not in the catalog without naming it', async () => {
      mockLibraryService.getTemplate.mockRejectedValue(new LibraryNotFoundError('demo'));

      await installFromCatalog();

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(TEMPLATE_INSTALLED_EVENT_TYPE, {
        success: false,
        source: 'catalog',
        sourceMode: 'http',
        errorType: 'template_not_found',
      });
    });

    it('reports a rendered workflow that fails validation as workflow_invalid', async () => {
      mockLibraryService.getTemplate.mockResolvedValue(INSTALLABLE_TEMPLATE);
      mockApi.createWorkflow.mockRejectedValue(new WorkflowValidationError('invalid', ['bad']));

      await installFromCatalog(connectorValues);

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
        TEMPLATE_INSTALLED_EVENT_TYPE,
        expect.objectContaining({ success: false, errorType: 'workflow_invalid' })
      );
    });

    it('reports a successful import with the slug and version stored on the workflow', async () => {
      mockApi.createWorkflow.mockResolvedValue({ id: 'wf-2' });

      await installFromFile(INSTALLABLE_TEMPLATE.raw, connectorValues);

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(TEMPLATE_INSTALLED_EVENT_TYPE, {
        success: true,
        source: 'file',
        sourceMode: 'http',
        templateSlug: 'demo',
        templateVersion: '1.0.0',
        solutions: ['security'],
        formFieldCount: 1,
        workflowId: 'wf-2',
      });
    });

    it('reports the template, but not its field names, when an imported form is invalid', async () => {
      await installFromFile(INSTALLABLE_TEMPLATE.raw);

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(TEMPLATE_INSTALLED_EVENT_TYPE, {
        success: false,
        source: 'file',
        sourceMode: 'http',
        templateSlug: 'demo',
        templateVersion: '1.0.0',
        solutions: ['security'],
        formFieldCount: 1,
        errorType: 'form_validation',
      });
    });

    it('reports an uploaded file that is not a template as template_parse', async () => {
      await installFromFile('not: a template');

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(TEMPLATE_INSTALLED_EVENT_TYPE, {
        success: false,
        source: 'file',
        sourceMode: 'http',
        errorType: 'template_parse',
      });
    });

    it('reports a template that cannot be shown', async () => {
      mockLibraryService.getTemplate.mockRejectedValue(new LibraryNotFoundError('missing'));

      await routeHandlers[`GET:${TEMPLATE_PATH}`].handler(
        mockContext,
        httpServerMock.createKibanaRequest({ params: { slug: 'missing' } }),
        httpServerMock.createResponseFactory()
      );

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(TEMPLATE_LOAD_FAILED_EVENT_TYPE, {
        reason: 'not_found',
      });
    });

    it('reports nothing when a template is shown', async () => {
      mockLibraryService.getTemplate.mockResolvedValue(INSTALLABLE_TEMPLATE);

      await routeHandlers[`GET:${TEMPLATE_PATH}`].handler(
        mockContext,
        httpServerMock.createKibanaRequest({ params: { slug: 'demo' } }),
        httpServerMock.createResponseFactory()
      );

      expect(mockAnalytics.reportEvent).not.toHaveBeenCalled();
    });
  });

  describe(`POST ${REMIX_PATH}`, () => {
    const REMIXED_YAML = 'name: Remixed demo\nsteps: []\n';
    const remixRequest = (slug = 'demo', version: string | undefined = '1.0.0') =>
      httpServerMock.createKibanaRequest({
        params: { slug },
        body: { yaml: REMIXED_YAML, ...(version !== undefined ? { version } : {}) },
      });

    it('should register the route handler', () => {
      expect(routeHandlers[`POST:${REMIX_PATH}`]).toBeDefined();
      expect(routeHandlers[`POST:${REMIX_PATH}`].handler).toEqual(expect.any(Function));
    });

    it('should create the workflow with the remixed catalog template as its origin', async () => {
      setToggle(true);
      mockLibraryService.listTemplates.mockResolvedValue([{ slug: 'demo', version: '1.0.0' }]);
      const createdWorkflow = { id: 'wf-remix', yaml: REMIXED_YAML };
      mockApi.createWorkflow.mockResolvedValue(createdWorkflow);

      const response = httpServerMock.createResponseFactory();
      const request = remixRequest();

      await routeHandlers[`POST:${REMIX_PATH}`].handler(mockContext, request, response);

      expect(mockApi.createWorkflow).toHaveBeenCalledWith(
        { yaml: REMIXED_YAML },
        'default',
        request,
        {
          templateOrigin: {
            templateSlug: 'demo',
            templateVersion: '1.0.0',
            templateOrigin: 'remix',
          },
        }
      );
      expect(mockAudit.logWorkflowCreated).toHaveBeenCalledWith(request, { id: 'wf-remix' });
      expect(response.ok).toHaveBeenCalledWith({ body: createdWorkflow });
    });

    it('should store a remix of a template outside the catalog as custom', async () => {
      setToggle(true);
      mockLibraryService.listTemplates.mockResolvedValue([{ slug: 'demo' }]);
      mockApi.createWorkflow.mockResolvedValue({ id: 'wf-remix' });

      const response = httpServerMock.createResponseFactory();
      const request = remixRequest('uploaded-template');

      await routeHandlers[`POST:${REMIX_PATH}`].handler(mockContext, request, response);

      expect(mockApi.createWorkflow).toHaveBeenCalledWith(
        { yaml: REMIXED_YAML },
        'default',
        request,
        {
          templateOrigin: { templateSlug: 'custom', templateOrigin: 'remix' },
        }
      );
    });

    it('should still create the workflow, without a template origin, when the library is off', async () => {
      setToggle(false);
      mockApi.createWorkflow.mockResolvedValue({ id: 'wf-remix' });

      const response = httpServerMock.createResponseFactory();
      const request = remixRequest();

      await routeHandlers[`POST:${REMIX_PATH}`].handler(mockContext, request, response);

      expect(mockLibraryService.listTemplates).not.toHaveBeenCalled();
      expect(mockApi.createWorkflow).toHaveBeenCalledWith(
        { yaml: REMIXED_YAML },
        'default',
        request,
        {
          templateOrigin: undefined,
        }
      );
      expect(response.ok).toHaveBeenCalledWith({ body: { id: 'wf-remix' } });
    });

    it('should audit the failure and map the error when workflow creation fails', async () => {
      setToggle(true);
      mockLibraryService.listTemplates.mockResolvedValue([{ slug: 'demo' }]);
      const creationError = new Error('remix creation boom');
      mockApi.createWorkflow.mockRejectedValue(creationError);

      const response = httpServerMock.createResponseFactory();
      const request = remixRequest();

      await routeHandlers[`POST:${REMIX_PATH}`].handler(mockContext, request, response);

      expect(mockAudit.logWorkflowCreateFailed).toHaveBeenCalledWith(request, creationError);
      expect(mockAudit.logWorkflowCreated).not.toHaveBeenCalled();
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: expect.stringContaining('remix creation boom') },
      });
    });
  });

  describe(`GET ${HEALTH_PATH}`, () => {
    it('should return 200 with the diagnostic payload + toggle state when enabled', async () => {
      setToggle(true);
      mockLibraryService.getHealth.mockReturnValue({
        sourceMode: 'http',
        lastRefreshAt: '2026-06-01T12:00:00.000Z',
      });

      const response = httpServerMock.createResponseFactory();

      await routeHandlers[`GET:${HEALTH_PATH}`].handler(
        mockContext,
        httpServerMock.createKibanaRequest(),
        response
      );

      expect(mockLibraryService.getHealth).toHaveBeenCalledTimes(1);
      expect(response.ok).toHaveBeenCalledWith({
        body: {
          sourceMode: 'http',
          lastRefreshAt: '2026-06-01T12:00:00.000Z',
          enabled: true,
        },
      });
    });

    it('should still return 200 (with `enabled: false`) when the toggle is off — diagnostics are not gated', async () => {
      setToggle(false);
      mockLibraryService.getHealth.mockReturnValue({ sourceMode: 'http' });

      const response = httpServerMock.createResponseFactory();

      await routeHandlers[`GET:${HEALTH_PATH}`].handler(
        mockContext,
        httpServerMock.createKibanaRequest(),
        response
      );

      expect(mockLibraryService.getHealth).toHaveBeenCalledTimes(1);
      expect(response.ok).toHaveBeenCalledWith({
        body: { sourceMode: 'http', enabled: false },
      });
      expect(response.customError).not.toHaveBeenCalled();
    });
  });
});
