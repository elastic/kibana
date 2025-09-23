/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';

import type { ArchiveAsset } from '../../../kibana/assets/install';

import { createAlertingRuleFromTemplate } from './step_create_alerting_rules';

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
        enabled: true,
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
    expect(result).toEqual({ id: 'fleet-default-test-package-template-id', type: 'alert' });
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
    expect(result).toEqual({ id: 'fleet-default-test-package-template-id', type: 'alert' });
  });
});
