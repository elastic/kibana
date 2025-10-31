/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientContext } from '../../../../rules_client';
import { muteAll } from './mute_all';
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
  partiallyUpdateRule: async () => {},
}));

const loggerErrorMock = jest.fn();
const getBulkMock = jest.fn();
const muteAllAlertsMock = jest.fn();

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
    muteAllAlerts: muteAllAlertsMock,
  },
  getAlertIndicesAlias: jest.fn().mockReturnValue(['.alerts-default']),
  spaceId: 'default',
} as unknown as RulesClientContext;

describe('muteAll', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should mute all alerts for a rule', async () => {
    const validParams = {
      id: 'rule-123',
    };

    await muteAll(context, validParams);

    expect(savedObjectsMock.get).toHaveBeenCalledWith(RULE_SAVED_OBJECT_TYPE, 'rule-123');
    expect(muteAllAlertsMock).toHaveBeenCalledWith({
      ruleId: 'rule-123',
      indices: ['.alerts-default'],
      logger: context.logger,
    });
  });

  it('should throw Boom.badRequest for invalid params', async () => {
    const invalidParams = {
      id: 22 as unknown as string,
    };

    await expect(muteAll(context, invalidParams)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Error validating mute all parameters - [id]: expected value of type [string] but got [number]"`
    );
  });

  it('should not call alertsService when no alert indices exist', async () => {
    (context.getAlertIndicesAlias as jest.Mock).mockReturnValue([]);
    const validParams = {
      id: 'rule-123',
    };

    await muteAll(context, validParams);

    expect(muteAllAlertsMock).not.toHaveBeenCalled();
  });

  it('should continue when alertsService fails', async () => {
    const loggerMock = loggingSystemMock.create().get();
    const contextWithLogger = {
      ...context,
      logger: loggerMock,
      getAlertIndicesAlias: jest.fn().mockReturnValue(['.alerts-default']),
      alertsService: {
        muteAllAlerts: jest.fn().mockRejectedValueOnce(new Error('ES connection failed')),
      },
    };
    const validParams = {
      id: 'rule-123',
    };

    await muteAll(contextWithLogger, validParams);
  });
});
