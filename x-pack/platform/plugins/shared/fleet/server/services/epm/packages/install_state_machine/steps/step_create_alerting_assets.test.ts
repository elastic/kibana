/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock, httpServerMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';

import { appContextService } from '../../../../app_context';
import type { ArchiveAsset } from '../../../kibana/assets/install';
import { createArchiveIteratorFromMap } from '../../../archive/archive_iterator';
import { createAppContextStartContractMock } from '../../../../../mocks';
import { saveKibanaAssetsRefs } from '../../install';

import type { InstallablePackage } from '../../../../../../common/types';

import { createSavedObjectClientMock } from '../../../../../mocks';

import {
  createAlertingRuleFromTemplate,
  createInactivityMonitoringTemplate,
  stepCreateAlertingAssets,
} from './step_create_alerting_assets';

jest.mock('../../install');

const logger = loggingSystemMock.createLogger();
const savedObjectsClient = savedObjectsClientMock.create();

let internalSoClientMock: ReturnType<typeof createSavedObjectClientMock>;

beforeEach(() => {
  internalSoClientMock = createSavedObjectClientMock();
  appContextService.start(
    createAppContextStartContractMock(
      {},
      false,
      { internal: internalSoClientMock },
      { enableIntegrationInactivityAlerting: true }
    )
  );
  jest.mocked(saveKibanaAssetsRefs).mockReset();
});

afterEach(() => {
  appContextService.stop();
});

describe('createAlertingRuleFromTemplate', () => {
  it('should create a rule if the rule does not exist', async () => {
    const rulesClient = {
      getTemplate: jest.fn().mockResolvedValue({
        id: 'template-id',
        ruleTypeId: 'rule-type-id',
        name: 'Template Rule',
        consumer: 'alerts',
        params: {},
        schedule: { interval: '1m' },
        actions: [],
        tags: [],
      }),
      get: jest.fn().mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError()),
      create: jest.fn().mockResolvedValue({ id: 'new-rule-id' }),
    } as unknown as RulesClientApi;

    const result = await createAlertingRuleFromTemplate(
      { rulesClient, logger },
      {
        alertTemplateArchiveAsset: { id: 'template-id' } as ArchiveAsset,
        pkgName: 'test-package',
        spaceId: 'default',
      }
    );

    expect(rulesClient.getTemplate).toHaveBeenCalledWith({ id: 'template-id' });
    expect(rulesClient.get).toHaveBeenCalledWith({ id: 'fleet-default-test-package-template-id' });
    expect(rulesClient.create).toHaveBeenCalledWith({
      data: {
        enabled: false,
        alertTypeId: 'rule-type-id',
        name: 'Template Rule',
        consumer: 'alerts',
        params: {},
        schedule: { interval: '1m' },
        actions: [],
        tags: [],
      },
      options: { id: 'fleet-default-test-package-template-id' },
    });
    expect(result).toEqual({
      id: 'fleet-default-test-package-template-id',
      deferred: false,
      type: 'alert',
    });
  });

  it('should not create a rule and return a deferred reference if user do not have access to alerts', async () => {
    const rulesClient = {
      getTemplate: jest.fn().mockRejectedValue(new Error('No access to alerts')),
      get: jest.fn().mockRejectedValue(new Error('No access to alerts')),
      create: jest.fn().mockRejectedValue(new Error('No access to alerts')),
    } as unknown as RulesClientApi;

    const result = await createAlertingRuleFromTemplate(
      { rulesClient, logger },
      {
        alertTemplateArchiveAsset: { id: 'template-id' } as ArchiveAsset,
        pkgName: 'test-package',
        spaceId: 'default',
      }
    );

    expect(rulesClient.getTemplate).toHaveBeenCalledWith({ id: 'template-id' });
    expect(rulesClient.get).not.toHaveBeenCalled();
    expect(rulesClient.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: 'fleet-default-test-package-template-id',
      deferred: true,
      type: 'alert',
    });
  });

  it('should not create a rule if the rule already exists', async () => {
    const rulesClient = {
      getTemplate: jest.fn().mockResolvedValue({
        id: 'template-id',
        ruleTypeId: 'rule-type-id',
        name: 'Template Rule',
        consumer: 'alerts',
        params: {},
        schedule: { interval: '1m' },
        actions: [],
        tags: [],
      }),
      get: jest.fn().mockResolvedValue({ id: 'existing-rule-id' }),
      create: jest.fn().mockResolvedValue({ id: 'new-rule-id' }),
    } as unknown as RulesClientApi;

    const result = await createAlertingRuleFromTemplate(
      { rulesClient, logger },
      {
        alertTemplateArchiveAsset: { id: 'template-id' } as ArchiveAsset,
        pkgName: 'test-package',
        spaceId: 'default',
      }
    );

    expect(rulesClient.getTemplate).toHaveBeenCalledWith({ id: 'template-id' });
    expect(rulesClient.get).toHaveBeenCalledWith({ id: 'fleet-default-test-package-template-id' });
    expect(rulesClient.create).not.toHaveBeenCalledWith();
    expect(result).toEqual({
      id: 'fleet-default-test-package-template-id',
      deferred: false,
      type: 'alert',
    });
  });
});

describe('createInactivityMonitoringTemplate', () => {
  const mockIntegrationPackage: InstallablePackage = {
    name: 'nginx',
    title: 'Nginx',
    version: '1.0.0',
    type: 'integration',
    description: 'Nginx integration',
    format_version: '1.0.0',
    release: 'ga',
    owner: { github: 'elastic/integrations' },
    data_streams: [
      {
        type: 'logs',
        dataset: 'nginx.access',
        title: 'Nginx access logs',
        release: 'ga',
        package: 'nginx',
        path: 'access',
      },
      {
        type: 'metrics',
        dataset: 'nginx.stubstatus',
        title: 'Nginx stubstatus metrics',
        release: 'ga',
        package: 'nginx',
        path: 'stubstatus',
      },
    ],
  };

  it('should create an inactivity monitoring template for an integration package on fresh install', async () => {
    internalSoClientMock.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError()
    );
    internalSoClientMock.create.mockResolvedValue({
      id: 'fleet-nginx-inactivity-monitoring',
      type: 'alerting_rule_template',
      attributes: {},
      references: [],
    });

    const result = await createInactivityMonitoringTemplate(
      { logger, savedObjectsClient },
      { packageInfo: mockIntegrationPackage }
    );

    expect(internalSoClientMock.create).toHaveBeenCalledWith(
      'alerting_rule_template',
      expect.objectContaining({
        name: '[Nginx] Inactivity monitoring',
        ruleTypeId: '.es-query',
        tags: [],
        schedule: { interval: '24h' },
        params: expect.objectContaining({
          searchType: 'esQuery',
          index: ['logs-nginx.access-*', 'metrics-nginx.stubstatus-*'],
          timeField: '@timestamp',
          timeWindowSize: 24,
          timeWindowUnit: 'h',
          threshold: [1],
          thresholdComparator: '<',
          size: 0,
          aggType: 'count',
          groupBy: 'all',
        }),
      }),
      { id: 'fleet-nginx-inactivity-monitoring' }
    );

    expect(saveKibanaAssetsRefs).toHaveBeenCalledWith(
      savedObjectsClient,
      'nginx',
      [{ id: 'fleet-nginx-inactivity-monitoring', type: 'alerting_rule_template' }],
      false,
      true
    );

    expect(result).toEqual({
      id: 'fleet-nginx-inactivity-monitoring',
      type: 'alerting_rule_template',
    });
  });

  it('should skip when feature flag is disabled', async () => {
    appContextService.stop();
    appContextService.start(
      createAppContextStartContractMock(
        {},
        false,
        { internal: internalSoClientMock },
        { enableIntegrationInactivityAlerting: false }
      )
    );

    const result = await createInactivityMonitoringTemplate(
      { logger, savedObjectsClient },
      { packageInfo: mockIntegrationPackage }
    );

    expect(result).toBeUndefined();
    expect(internalSoClientMock.create).not.toHaveBeenCalled();
  });

  it('should recreate the template on upgrade when it was deleted', async () => {
    internalSoClientMock.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError()
    );
    internalSoClientMock.create.mockResolvedValue({
      id: 'fleet-nginx-inactivity-monitoring',
      type: 'alerting_rule_template',
      attributes: {},
      references: [],
    });

    const result = await createInactivityMonitoringTemplate(
      { logger, savedObjectsClient },
      { packageInfo: mockIntegrationPackage }
    );

    expect(internalSoClientMock.create).toHaveBeenCalled();
    expect(saveKibanaAssetsRefs).toHaveBeenCalledWith(
      savedObjectsClient,
      'nginx',
      [{ id: 'fleet-nginx-inactivity-monitoring', type: 'alerting_rule_template' }],
      false,
      true
    );
    expect(result).toEqual({
      id: 'fleet-nginx-inactivity-monitoring',
      type: 'alerting_rule_template',
    });
  });

  it('should skip when package type is not integration', async () => {
    const inputPackage: InstallablePackage = {
      ...mockIntegrationPackage,
      type: 'input',
    };

    const result = await createInactivityMonitoringTemplate(
      { logger, savedObjectsClient },
      { packageInfo: inputPackage }
    );

    expect(result).toBeUndefined();
    expect(internalSoClientMock.create).not.toHaveBeenCalled();
  });

  it('should skip when package has no data streams', async () => {
    const noDataStreamsPackage: InstallablePackage = {
      ...mockIntegrationPackage,
      data_streams: undefined,
    };

    const result = await createInactivityMonitoringTemplate(
      { logger, savedObjectsClient },
      { packageInfo: noDataStreamsPackage }
    );

    expect(result).toBeUndefined();
    expect(internalSoClientMock.create).not.toHaveBeenCalled();
  });

  it('should not recreate but re-register asset ref if template already exists with same data streams (e.g. on reinstall)', async () => {
    internalSoClientMock.get.mockResolvedValue({
      id: 'fleet-nginx-inactivity-monitoring',
      type: 'alerting_rule_template',
      attributes: {
        params: {
          index: ['logs-nginx.access-*', 'metrics-nginx.stubstatus-*'],
        },
      },
      references: [],
    });

    const result = await createInactivityMonitoringTemplate(
      { logger, savedObjectsClient },
      { packageInfo: mockIntegrationPackage }
    );

    expect(internalSoClientMock.create).not.toHaveBeenCalled();
    expect(internalSoClientMock.update).not.toHaveBeenCalled();
    expect(saveKibanaAssetsRefs).toHaveBeenCalledWith(
      savedObjectsClient,
      'nginx',
      [{ id: 'fleet-nginx-inactivity-monitoring', type: 'alerting_rule_template' }],
      false,
      true
    );
    expect(result).toEqual({
      id: 'fleet-nginx-inactivity-monitoring',
      type: 'alerting_rule_template',
    });
  });

  it('should update index patterns if data streams changed on upgrade', async () => {
    internalSoClientMock.get.mockResolvedValue({
      id: 'fleet-nginx-inactivity-monitoring',
      type: 'alerting_rule_template',
      attributes: {
        params: {
          searchType: 'esQuery',
          esQuery: JSON.stringify({ query: { match_all: {} } }),
          index: ['logs-nginx.access-*'],
          timeField: '@timestamp',
          timeWindowSize: 24,
          timeWindowUnit: 'h',
          threshold: [1],
          thresholdComparator: '<',
          size: 0,
          aggType: 'count',
          groupBy: 'all',
          excludeHitsFromPreviousRun: true,
        },
      },
      references: [],
    });
    internalSoClientMock.update.mockResolvedValue({
      id: 'fleet-nginx-inactivity-monitoring',
      type: 'alerting_rule_template',
      attributes: {},
      references: [],
    });

    const result = await createInactivityMonitoringTemplate(
      { logger, savedObjectsClient },
      { packageInfo: mockIntegrationPackage }
    );

    expect(internalSoClientMock.create).not.toHaveBeenCalled();
    expect(internalSoClientMock.update).toHaveBeenCalledWith(
      'alerting_rule_template',
      'fleet-nginx-inactivity-monitoring',
      {
        params: expect.objectContaining({
          searchType: 'esQuery',
          index: ['logs-nginx.access-*', 'metrics-nginx.stubstatus-*'],
          timeField: '@timestamp',
        }),
      }
    );
    expect(saveKibanaAssetsRefs).toHaveBeenCalledWith(
      savedObjectsClient,
      'nginx',
      [{ id: 'fleet-nginx-inactivity-monitoring', type: 'alerting_rule_template' }],
      false,
      true
    );
    expect(result).toEqual({
      id: 'fleet-nginx-inactivity-monitoring',
      type: 'alerting_rule_template',
    });
  });

  it('should return undefined and log error on failure', async () => {
    internalSoClientMock.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError()
    );
    internalSoClientMock.create.mockRejectedValue(new Error('SO creation failed'));

    const result = await createInactivityMonitoringTemplate(
      { logger, savedObjectsClient },
      { packageInfo: mockIntegrationPackage }
    );

    expect(result).toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error creating inactivity monitoring template for package nginx'),
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});

describe('stepCreateAlertingAssets', () => {
  beforeEach(() => {
    jest.mocked(saveKibanaAssetsRefs).mockReset();
  });
  it('does nothing for non elastic_agent package', async () => {
    const context = {
      packageInstallContext: {
        packageInfo: { name: 'not-elastic-agent' },
        archivePackage: { assets: [] },
        savedObjectsClient: {} as any,
        esClient: {} as any,
        rulesClient: {} as any,
      },
      logger: loggingSystemMock.createLogger(),
      request: httpServerMock.createKibanaRequest(),
    };

    await stepCreateAlertingAssets(context as any);

    expect(saveKibanaAssetsRefs).not.toHaveBeenCalled();
  });

  it('install elastic_agent rules', async () => {
    const rulesClient = {
      getTemplate: jest.fn().mockResolvedValue({
        id: 'template-id',
        ruleTypeId: 'rule-type-id',
        name: 'Template Rule',
        consumer: 'alerts',
        params: {},
        schedule: { interval: '1m' },
        actions: [],
        tags: [],
      }),
      get: jest.fn().mockResolvedValue({ id: 'existing-rule-id' }),
      create: jest.fn().mockResolvedValue({ id: 'new-rule-id' }),
    } as unknown as RulesClientApi;

    jest
      .mocked(appContextService.getAlertingStart()!.getRulesClientWithRequest)
      .mockResolvedValue(rulesClient);

    const context = {
      savedObjectsClient,
      packageInstallContext: {
        packageInfo: { name: 'elastic_agent' },
        archiveIterator: createArchiveIteratorFromMap(
          new Map([
            [
              'elastic_agent-0.0.1/kibana/alerting_rule_template/template-1.json',
              Buffer.from(
                JSON.stringify({
                  id: 'template-id',
                })
              ),
            ],
          ])
        ),
        esClient: {} as any,
        rulesClient: {} as any,
      },
      logger: loggingSystemMock.createLogger(),
      request: httpServerMock.createKibanaRequest(),
    };

    await stepCreateAlertingAssets(context as any);
    expect(saveKibanaAssetsRefs).toHaveBeenCalledWith(
      expect.anything(),
      'elastic_agent',
      [
        {
          id: 'fleet-default-elastic_agent-template-id',
          type: 'alert',
          deferred: false,
        },
      ],
      false,
      true
    );
  });
});
