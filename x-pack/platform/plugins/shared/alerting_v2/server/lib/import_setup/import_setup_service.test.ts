/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { parse } from 'yaml';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { ImportResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import {
  ImportSetupService,
  type ImportSetupActionsClient,
  type ImportSetupConfigClient,
  type ImportSetupWorkflowsApi,
} from './import_setup_service';

type ActionsConnector = Awaited<ReturnType<ImportSetupActionsClient['get']>>;
type ActionsConnectorType = Awaited<ReturnType<ImportSetupActionsClient['listTypes']>>[number];

const buildConnector = (overrides: Partial<ActionsConnector> = {}): ActionsConnector => ({
  id: 'dd-1',
  name: 'Datadog (prod)',
  actionTypeId: '.datadog',
  isPreconfigured: false,
  isDeprecated: false,
  isSystemAction: false,
  isConnectorTypeDeprecated: false,
  isInboundEventsEnabled: true,
  ...overrides,
});

const buildConnectorType = (id: string): ActionsConnectorType => ({
  id,
  name: id,
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'enterprise',
  supportedFeatureIds: ['importAlerts'],
  isSystemActionType: false,
  isDeprecated: false,
  source: 'spec',
  isTestable: true,
});

const managedImportResponse: ImportResponse = {
  id: 'dd-1',
  name: 'Datadog (prod)',
  kind: 'managed',
  enabled: true,
  source: 'datadog',
  connector_id: 'dd-1',
  connector_type_id: '.datadog',
  workflow_id: 'system-datadog-alert-translation',
  tags: [],
  routing_tags: [],
  created_by: null,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_by: null,
  updated_at: '2025-01-01T00:00:00.000Z',
};

const importResponse: ImportResponse = {
  id: 'import-1',
  name: 'Datadog',
  kind: 'custom',
  enabled: true,
  source: 'datadog',
  connector_id: 'connector-1',
  workflow_id: 'workflow-1',
  tags: [],
  routing_tags: [],
  fingerprint_field: 'monitor_id',
  created_by: null,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_by: null,
  updated_at: '2025-01-01T00:00:00.000Z',
};

describe('ImportSetupService', () => {
  let actionsClient: jest.Mocked<ImportSetupActionsClient>;
  let workflows: jest.Mocked<ImportSetupWorkflowsApi>;
  let importConfigClient: jest.Mocked<ImportSetupConfigClient>;

  const createService = ({ publicBaseUrl }: { publicBaseUrl?: string } = {}) => {
    const { loggerService } = createLoggerService();
    return new ImportSetupService(
      importConfigClient,
      actionsClient,
      workflows,
      httpServerMock.createKibanaRequest(),
      'default',
      'http://localhost:5601',
      publicBaseUrl,
      loggerService
    );
  };

  beforeEach(() => {
    actionsClient = {
      create: jest.fn().mockResolvedValue({ id: 'connector-1' }),
      delete: jest.fn().mockResolvedValue({}),
      get: jest.fn(),
      rotateInboundIngress: jest.fn().mockResolvedValue({ ingestToken: 'cred.secret' }),
      listTypes: jest.fn().mockResolvedValue([buildConnectorType('.datadog')]),
    };
    workflows = {
      createWorkflow: jest.fn().mockResolvedValue({ id: 'workflow-1' }),
      deleteWorkflows: jest.fn().mockResolvedValue({ total: 1, deleted: 1, failures: [] }),
      updateWorkflow: jest.fn().mockResolvedValue({}),
      testWorkflow: jest.fn().mockResolvedValue('execution-1'),
      getWorkflow: jest.fn(),
      getWorkflowExecutions: jest.fn(),
    };
    importConfigClient = {
      createImportConfig: jest.fn().mockResolvedValue(importResponse),
      getImportConfig: jest.fn().mockResolvedValue(importResponse),
      updateImportConfig: jest.fn().mockResolvedValue(importResponse),
      deleteImportConfig: jest.fn().mockResolvedValue(undefined),
    };
  });

  describe('createImport', () => {
    it('creates the connector, the token, the workflow and the record, and returns the credentials', async () => {
      const result = await createService({
        publicBaseUrl: 'https://kibana.example.com',
      }).createImport({
        name: 'Datadog',
        fingerprint_field: 'monitor_id',
      });

      expect(actionsClient.create).toHaveBeenCalledWith({
        action: expect.objectContaining({
          actionTypeId: '.inboundWebhook',
          secrets: { authType: 'none' },
        }),
      });
      expect(actionsClient.rotateInboundIngress).toHaveBeenCalledWith({ id: 'connector-1' });
      expect(importConfigClient.createImportConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'datadog',
          connectorId: 'connector-1',
          workflowId: 'workflow-1',
        })
      );
      expect(result).toEqual({
        import: importResponse,
        url: 'https://kibana.example.com/api/actions/events/.inboundWebhook/connector-1',
        credentials: {
          url: 'https://kibana.example.com/api/actions/events/.inboundWebhook/connector-1',
          token: 'cred.secret',
        },
        public_base_url_configured: true,
      });
    });

    it('gives the workflow the id the record is saved under', async () => {
      await createService().createImport({ name: 'Datadog' });

      const [{ yaml }] = workflows.createWorkflow.mock.calls[0];
      const { id } = importConfigClient.createImportConfig.mock.calls[0][0];
      expect(parse(yaml).consts.import_id).toBe(id);
    });

    it('falls back to the server address and says the public base url is not set', async () => {
      const result = await createService().createImport({ name: 'Datadog' });

      expect(result.url).toBe(
        'http://localhost:5601/api/actions/events/.inboundWebhook/connector-1'
      );
      expect(result.public_base_url_configured).toBe(false);
    });

    it('removes the connector when the workflow cannot be created', async () => {
      workflows.createWorkflow.mockRejectedValue(new Error('invalid workflow'));

      await expect(createService().createImport({ name: 'Datadog' })).rejects.toMatchObject({
        message: expect.stringContaining('create_workflow'),
        data: {
          code: ALERTING_ERROR_CODES.IMPORT_SETUP_FAILED,
          details: { step: 'create_workflow', rolled_back: ['connector connector-1'] },
        },
      });
      expect(actionsClient.delete).toHaveBeenCalledWith({ id: 'connector-1' });
      expect(importConfigClient.createImportConfig).not.toHaveBeenCalled();
    });

    it('removes the workflow, then the connector, when the record cannot be saved', async () => {
      importConfigClient.createImportConfig.mockRejectedValue(new Error('boom'));

      await expect(createService().createImport({ name: 'Datadog' })).rejects.toMatchObject({
        data: {
          details: {
            step: 'save_import',
            rolled_back: ['workflow workflow-1', 'connector connector-1'],
          },
        },
      });
      expect(workflows.deleteWorkflows.mock.invocationCallOrder[0]).toBeLessThan(
        actionsClient.delete.mock.invocationCallOrder[0]
      );
    });

    it('creates nothing else when the connector cannot be created', async () => {
      actionsClient.create.mockRejectedValue(Boom.forbidden('no license'));

      await expect(createService().createImport({ name: 'Datadog' })).rejects.toMatchObject({
        output: { statusCode: 403 },
        data: { details: { step: 'create_connector', rolled_back: [] } },
      });
      expect(workflows.createWorkflow).not.toHaveBeenCalled();
    });

    it('still reports the failed step when a rollback step fails too', async () => {
      importConfigClient.createImportConfig.mockRejectedValue(new Error('boom'));
      workflows.deleteWorkflows.mockRejectedValue(new Error('cannot delete'));

      await expect(createService().createImport({ name: 'Datadog' })).rejects.toMatchObject({
        data: { details: { step: 'save_import', rolled_back: ['connector connector-1'] } },
      });
    });
  });

  describe('createManagedImport', () => {
    beforeEach(() => {
      actionsClient.get.mockResolvedValue(buildConnector());
      importConfigClient.getImportConfig.mockRejectedValue(Boom.notFound('none'));
      importConfigClient.createImportConfig.mockResolvedValue(managedImportResponse);
    });

    it('saves a record with the connector id, the shared workflow and the type source', async () => {
      const result = await createService({
        publicBaseUrl: 'https://kibana.example.com',
      }).createManagedImport({ kind: 'managed', connector_id: 'dd-1', tags: ['prod'] });

      expect(importConfigClient.createImportConfig).toHaveBeenCalledWith({
        data: { kind: 'managed', connector_id: 'dd-1', tags: ['prod'], name: 'Datadog (prod)' },
        id: 'dd-1',
        kind: 'managed',
        source: 'datadog',
        connectorTypeId: '.datadog',
        connectorId: 'dd-1',
        workflowId: 'system-datadog-alert-translation',
      });
      expect(result.url).toBe('https://kibana.example.com/api/actions/events/.datadog/dd-1');
      expect(result.credentials).toBeUndefined();
    });

    it('creates no connector or workflow and does not rotate the token', async () => {
      await createService().createManagedImport({ kind: 'managed', connector_id: 'dd-1' });

      expect(actionsClient.create).not.toHaveBeenCalled();
      expect(workflows.createWorkflow).not.toHaveBeenCalled();
      expect(actionsClient.rotateInboundIngress).not.toHaveBeenCalled();
    });

    it('uses the name it is given', async () => {
      await createService().createManagedImport({
        kind: 'managed',
        connector_id: 'dd-1',
        name: 'Prod monitors',
      });

      expect(importConfigClient.createImportConfig).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'Prod monitors' }) })
      );
    });

    it('rejects a connector type without the importAlerts feature', async () => {
      actionsClient.listTypes.mockResolvedValue([]);

      await expect(
        createService().createManagedImport({ kind: 'managed', connector_id: 'dd-1' })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        data: { code: ALERTING_ERROR_CODES.IMPORT_CONNECTOR_NOT_SUPPORTED },
      });
    });

    it('rejects a connector type that has no managed workflow', async () => {
      actionsClient.get.mockResolvedValue(buildConnector({ actionTypeId: '.other' }));
      actionsClient.listTypes.mockResolvedValue([buildConnectorType('.other')]);

      await expect(
        createService().createManagedImport({ kind: 'managed', connector_id: 'dd-1' })
      ).rejects.toMatchObject({
        data: { code: ALERTING_ERROR_CODES.IMPORT_CONNECTOR_NOT_SUPPORTED },
      });
    });

    it('rejects a connector with receiving events turned off', async () => {
      actionsClient.get.mockResolvedValue(buildConnector({ isInboundEventsEnabled: false }));

      await expect(
        createService().createManagedImport({ kind: 'managed', connector_id: 'dd-1' })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        data: { code: ALERTING_ERROR_CODES.IMPORT_CONNECTOR_INBOUND_DISABLED },
      });
      expect(importConfigClient.createImportConfig).not.toHaveBeenCalled();
    });

    it('rejects a connector that already has an import', async () => {
      importConfigClient.getImportConfig.mockResolvedValue(managedImportResponse);

      await expect(
        createService().createManagedImport({ kind: 'managed', connector_id: 'dd-1' })
      ).rejects.toMatchObject({
        output: { statusCode: 409 },
        data: { code: ALERTING_ERROR_CODES.IMPORT_ALREADY_EXISTS },
      });
    });
  });

  describe('rotateToken', () => {
    it('rotates the token of the import connector', async () => {
      const result = await createService().rotateToken({ id: 'import-1' });

      expect(actionsClient.rotateInboundIngress).toHaveBeenCalledWith({ id: 'connector-1' });
      expect(result.credentials.token).toBe('cred.secret');
    });
  });

  describe('rotateToken for a managed import', () => {
    it('builds the URL for the connector type', async () => {
      importConfigClient.getImportConfig.mockResolvedValue(managedImportResponse);

      const result = await createService().rotateToken({ id: 'dd-1' });

      expect(result.credentials.url).toBe('http://localhost:5601/api/actions/events/.datadog/dd-1');
    });
  });

  describe('testImport', () => {
    it('runs the shared workflow with a Datadog body for a managed import', async () => {
      importConfigClient.getImportConfig.mockResolvedValue(managedImportResponse);

      const result = await createService().testImport({ id: 'dd-1' });

      expect(workflows.testWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'system-datadog-alert-translation',
          inputs: {
            event: expect.objectContaining({
              connectorId: 'dd-1',
              connectorTypeId: '.datadog',
              body: result.payload,
            }),
          },
        })
      );
      expect(result.payload).toMatchObject({
        monitor_id: expect.any(String),
        scopes: expect.any(Array),
      });
    });

    it('runs the import workflow with a sample body carrying the fingerprint field', async () => {
      const result = await createService().testImport({ id: 'import-1' });

      expect(workflows.testWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'workflow-1',
          inputs: {
            event: expect.objectContaining({ body: result.payload, connectorId: 'connector-1' }),
          },
        })
      );
      expect(result.execution_id).toBe('execution-1');
      expect(result.payload).toMatchObject({ test: true, monitor_id: expect.any(String) });
    });

    it('sends the payload it is given', async () => {
      const result = await createService().testImport({ id: 'import-1', payload: { a: 1 } });

      expect(result.payload).toEqual({ a: 1 });
    });
  });

  describe('updateImport for a managed import', () => {
    it('never switches the shared workflow', async () => {
      importConfigClient.getImportConfig.mockResolvedValue(managedImportResponse);

      await createService().updateImport({ id: 'dd-1', data: { enabled: false } });

      expect(workflows.updateWorkflow).not.toHaveBeenCalled();
      expect(importConfigClient.updateImportConfig).toHaveBeenCalled();
    });
  });

  describe('updateImport', () => {
    it('switches the workflow when enabled changes', async () => {
      await createService().updateImport({ id: 'import-1', data: { enabled: false } });

      expect(workflows.updateWorkflow).toHaveBeenCalledWith(
        'workflow-1',
        { enabled: false },
        'default',
        expect.anything()
      );
      expect(importConfigClient.updateImportConfig).toHaveBeenCalled();
    });

    it('does not touch the workflow for other edits', async () => {
      await createService().updateImport({ id: 'import-1', data: { name: 'New name' } });

      expect(workflows.updateWorkflow).not.toHaveBeenCalled();
    });

    it('still saves the record when the workflow is gone', async () => {
      workflows.updateWorkflow.mockRejectedValue(Boom.notFound('gone'));

      await createService().updateImport({ id: 'import-1', data: { enabled: false } });

      expect(importConfigClient.updateImportConfig).toHaveBeenCalled();
    });
  });

  describe('deleteImport', () => {
    it('deletes only the record by default', async () => {
      await createService().deleteImport({ id: 'import-1', deleteResources: false });

      expect(importConfigClient.deleteImportConfig).toHaveBeenCalledWith({ id: 'import-1' });
      expect(workflows.deleteWorkflows).not.toHaveBeenCalled();
      expect(actionsClient.delete).not.toHaveBeenCalled();
    });

    it('deletes the workflow and the connector too when asked', async () => {
      await createService().deleteImport({ id: 'import-1', deleteResources: true });

      expect(workflows.deleteWorkflows).toHaveBeenCalledWith(
        ['workflow-1'],
        'default',
        expect.anything()
      );
      expect(actionsClient.delete).toHaveBeenCalledWith({ id: 'connector-1' });
      expect(importConfigClient.deleteImportConfig).toHaveBeenCalled();
    });

    it('deletes only the connector, never the shared workflow, for a managed import', async () => {
      importConfigClient.getImportConfig.mockResolvedValue(managedImportResponse);

      await createService().deleteImport({ id: 'dd-1', deleteResources: true });

      expect(workflows.deleteWorkflows).not.toHaveBeenCalled();
      expect(actionsClient.delete).toHaveBeenCalledWith({ id: 'dd-1' });
      expect(importConfigClient.deleteImportConfig).toHaveBeenCalledWith({ id: 'dd-1' });
    });

    it('skips resources that are already gone', async () => {
      workflows.deleteWorkflows.mockResolvedValue({
        total: 1,
        deleted: 0,
        failures: [{ id: 'workflow-1', error: 'Workflow not found' }],
      });
      actionsClient.delete.mockRejectedValue(Boom.notFound('gone'));

      await createService().deleteImport({ id: 'import-1', deleteResources: true });

      expect(importConfigClient.deleteImportConfig).toHaveBeenCalled();
    });

    it('keeps the record when a resource cannot be deleted', async () => {
      actionsClient.delete.mockRejectedValue(new Error('cannot delete'));

      await expect(
        createService().deleteImport({ id: 'import-1', deleteResources: true })
      ).rejects.toThrow('cannot delete');
      expect(importConfigClient.deleteImportConfig).not.toHaveBeenCalled();
    });
  });
});
