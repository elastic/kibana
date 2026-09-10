/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientContext } from '../../../../rules_client';
import { unmuteAll } from './unmute_all';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';

jest.mock('../../../../lib/retry_if_conflicts', () => ({
  retryIfConflicts: (_: unknown, id: unknown, asyncFn: () => Promise<unknown>) => {
    return asyncFn();
  },
}));

jest.mock('../../../../rules_client/lib', () => ({
  updateMetaAttributes: () => {},
}));

jest.mock('../../../../saved_objects', () => ({
  partiallyUpdateRule: jest.fn(),
}));

const loggerErrorMock = jest.fn();
const getBulkMock = jest.fn();
const unmuteAllAlertsMock = jest.fn();

const savedObjectsMock = savedObjectsRepositoryMock.create();
savedObjectsMock.get = jest.fn().mockReturnValue({
  attributes: {
    actions: [],
    alertTypeId: 'test-type',
  },
  version: '9.0.0',
});

const context = {
  logger: { error: loggerErrorMock },
  getActionsClient: () => {
    return {
      getBulk: getBulkMock,
    };
  },
  unsecuredSavedObjectsClient: savedObjectsMock,
  authorization: { ensureAuthorized: async () => {} },
  ruleTypeRegistry: {
    ensureRuleTypeEnabled: () => {},
  },
  getUserName: async () => {},
  alertsService: {
    unmuteAllAlerts: unmuteAllAlertsMock,
  },
  getAlertIndicesAlias: jest.fn().mockReturnValue(['.alerts-default']),
  spaceId: 'default',
} as unknown as RulesClientContext;

describe('unmuteAll', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should unmute all alerts for a rule', async () => {
    const validParams = {
      id: 'rule-123',
    };

    await unmuteAll(context, validParams);

    expect(savedObjectsMock.get).toHaveBeenCalledWith(RULE_SAVED_OBJECT_TYPE, 'rule-123');
    expect(unmuteAllAlertsMock).toHaveBeenCalledWith({
      ruleId: 'rule-123',
      indices: ['.alerts-default'],
      logger: context.logger,
    });
  });

  it('should throw Boom.badRequest for invalid params', async () => {
    const invalidParams = {
      id: 22,
    };

    // @ts-expect-error wrong type for testing purposes
    await expect(unmuteAll(context, invalidParams)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Error validating unmute all parameters - [id]: expected value of type [string] but got [number]"`
    );
  });

  it('should not call alertsService when no alert indices exist', async () => {
    (context.getAlertIndicesAlias as jest.Mock).mockReturnValue([]);
    const validParams = {
      id: 'rule-123',
    };

    await unmuteAll(context, validParams);

    expect(unmuteAllAlertsMock).not.toHaveBeenCalled();
  });

  it('throws error but still updates rule when alertsService fails', async () => {
    const loggerMock = loggingSystemMock.create().get();
    const unmuteAllAlertsErrorMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('ES connection failed'));
    const { partiallyUpdateRule: partiallyUpdateRuleMock } = jest.requireMock(
      '../../../../saved_objects'
    );
    const contextWithLogger = {
      ...context,
      logger: loggerMock,
      getAlertIndicesAlias: jest.fn().mockReturnValue(['.alerts-default']),
      alertsService: {
        unmuteAllAlerts: unmuteAllAlertsErrorMock,
      },
    } as unknown as RulesClientContext;
    const validParams = {
      id: 'rule-123',
    };

    await expect(unmuteAll(contextWithLogger, validParams)).rejects.toThrow('ES connection failed');
    expect(partiallyUpdateRuleMock).toHaveBeenCalled();
  });
});
