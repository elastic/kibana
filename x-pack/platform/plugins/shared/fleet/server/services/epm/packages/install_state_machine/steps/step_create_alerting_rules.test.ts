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

import {
  createAlertingRuleFromTemplate,
  stepCreateAlertingRules,
} from './step_create_alerting_rules';

jest.mock('../../install');

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

    const logger = loggingSystemMock.createLogger();

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

    const logger = loggingSystemMock.createLogger();

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

    const logger = loggingSystemMock.createLogger();

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

describe('stepCreateAlertingRules', () => {
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

    await stepCreateAlertingRules(context as any);

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

    appContextService.start(createAppContextStartContractMock());
    jest
      .mocked(appContextService.getAlertingStart()!.getRulesClientWithRequest)
      .mockResolvedValue(rulesClient);
    const savedObjectsClient = savedObjectsClientMock.create();

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

    await stepCreateAlertingRules(context as any);
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
