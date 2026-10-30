/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler, RouteValidatorFullConfigRequest } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { apiPrivileges } from '@kbn/context-engine-plugin/common/features';
import {
  AiIndexConflictError,
  AiIndexNotFoundError,
} from '@kbn/context-engine-plugin/server/ai_indices/errors';
import {
  AUTOMATION_TEMPLATES_PATH,
  INSTALL_AUTOMATION_TEMPLATE_PATH,
} from '../../common/automation_templates';
import { installAutomationTemplate } from '../automation_templates/install_automation_template';
import {
  ContextEngineDisabledError,
  InsufficientPrivilegesError,
  InvalidTemplateParamsError,
} from '../errors';
import { registerAutomationTemplateRoutes } from './automation_templates';

jest.mock('../automation_templates/install_automation_template', () => ({
  installAutomationTemplate: jest.fn(),
}));

const installMock = installAutomationTemplate as jest.MockedFunction<
  typeof installAutomationTemplate
>;

interface RegisteredRoute {
  config: { path: string; access: string; security: { authz: { requiredPrivileges: string[] } } };
  validate: false | { request: RouteValidatorFullConfigRequest<unknown, unknown, unknown> };
  handler: RequestHandler;
}

describe('automation template routes', () => {
  let routes: Record<string, RegisteredRoute>;
  const getSpaceId = jest.fn().mockResolvedValue('space-1');

  beforeEach(() => {
    jest.clearAllMocks();
    routes = {};
    const versioned = (method: string) => (config: RegisteredRoute['config']) => ({
      addVersion: (
        { validate }: { validate: RegisteredRoute['validate'] },
        handler: RequestHandler
      ) => {
        routes[`${method} ${config.path}`] = { config, validate, handler };
      },
    });

    registerAutomationTemplateRoutes({
      router: { versioned: { get: versioned('GET'), post: versioned('POST') } } as never,
      getSpaceId,
      logger: loggingSystemMock.createLogger(),
      getAiIndexService: async () => ({} as never),
      getCoreStart: async () => ({} as never),
      getSecurityStart: async () => undefined,
      getWorkflowsManagement: () => ({} as never),
    });
  });

  const list = () => routes[`GET ${AUTOMATION_TEMPLATES_PATH}`];
  const install = () => routes[`POST ${INSTALL_AUTOMATION_TEMPLATE_PATH}`];

  const callInstall = async (body: Record<string, unknown>) => {
    const response = httpServerMock.createResponseFactory();
    await install().handler(
      {} as never,
      httpServerMock.createKibanaRequest({ params: { aiIndexId: 'airline-loyalty' }, body }),
      response
    );
    return response;
  };

  const documentBody = {
    template: 'document_orchestration',
    name: 'kb-docs',
    params: {
      sourceIndex: 'kb',
      titleField: 'title',
      bodyField: 'body',
      corpusFilter: '',
      maxDocuments: 50,
      bodyMaxChars: 12000,
    },
  };

  it('registers both routes as internal, reading and writing Context Engine respectively', () => {
    expect(list().config).toEqual(
      expect.objectContaining({
        access: 'internal',
        security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
      })
    );
    expect(install().config).toEqual(
      expect.objectContaining({
        access: 'internal',
        security: { authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] } },
      })
    );
  });

  it('lists the templates', async () => {
    const response = httpServerMock.createResponseFactory();
    await list().handler({} as never, httpServerMock.createKibanaRequest(), response);

    const { templates } = response.ok.mock.calls[0][0]?.body as {
      templates: Array<{ id: string }>;
    };
    expect(templates.map(({ id }) => id)).toContain('unit_profile');
  });

  it('validates the install body against the template it names', () => {
    const { validate } = install();
    if (!validate) {
      throw new Error('The install route must validate its request.');
    }
    const body = validate.request.body;
    if (typeof body !== 'function') {
      throw new Error('The install body must be validated with a function.');
    }
    const validation = {
      ok: (value: unknown) => ({ value }),
      badRequest: (error: unknown) => ({ error }),
    };

    expect(body(documentBody, validation as never)).toHaveProperty('value');
    expect(
      body({ ...documentBody, params: { sourceIndex: 'kb' } }, validation as never)
    ).toHaveProperty('error');
  });

  it('installs the template on the AI index in the path, in the request space', async () => {
    installMock.mockResolvedValue({
      aiIndexId: 'airline-loyalty',
      workflowId: 'wf-1',
      status: 'saved_and_attached',
      replaced: false,
    });

    const response = await callInstall(documentBody);

    expect(installMock).toHaveBeenCalledWith(
      expect.objectContaining({
        aiIndexId: 'airline-loyalty',
        spaceId: 'space-1',
        params: expect.objectContaining({ template: 'document_orchestration', name: 'kb-docs' }),
      })
    );
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        aiIndexId: 'airline-loyalty',
        workflowId: 'wf-1',
        status: 'saved_and_attached',
        replaced: false,
      },
    });
  });

  it.each([
    ['badRequest', new InvalidTemplateParamsError('unitKey contains a backtick')],
    ['forbidden', new InsufficientPrivilegesError('Unauthorized to create a workflow.')],
    ['notFound', new AiIndexNotFoundError('airline-loyalty')],
    ['notFound', new ContextEngineDisabledError()],
    ['conflict', new AiIndexConflictError('airline-loyalty')],
  ] as const)('answers %s for %p', async (status, error) => {
    installMock.mockRejectedValue(error);

    const response = await callInstall(documentBody);

    expect(response[status]).toHaveBeenCalledWith({ body: { message: error.message } });
  });

  it('answers 500 for anything else', async () => {
    installMock.mockRejectedValue(new Error('boom'));

    const response = await callInstall(documentBody);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'boom' },
    });
  });
});
