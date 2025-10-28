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
import { ALERT_MUTED, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
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
const updateByQueryMock = jest.fn().mockResolvedValue({ updated: 1 });

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
  elasticsearchClient: {
    updateByQuery: updateByQueryMock,
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
    expect(updateByQueryMock).toHaveBeenCalledWith({
      index: ['.alerts-default'],
      conflicts: 'proceed',
      refresh: true,
      query: {
        term: { [ALERT_RULE_UUID]: 'rule-123' },
      },
      script: {
        source: `ctx._source['${ALERT_MUTED}'] = false;`,
        lang: 'painless',
      },
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

  it('should not call ES updateByQuery when no alert indices exist', async () => {
    (context.getAlertIndicesAlias as jest.Mock).mockReturnValue([]);
    const validParams = {
      id: 'rule-123',
    };

    await unmuteAll(context, validParams);

    expect(updateByQueryMock).not.toHaveBeenCalled();
  });

  it('should log error but continue when ES updateByQuery fails', async () => {
    const loggerMock = loggingSystemMock.create().get();
    const contextWithLogger = {
      ...context,
      logger: loggerMock,
      getAlertIndicesAlias: jest.fn().mockReturnValue(['.alerts-default']),
    };
    updateByQueryMock.mockRejectedValueOnce(new Error('ES connection failed'));
    const validParams = {
      id: 'rule-123',
    };

    await unmuteAll(contextWithLogger, validParams);

    expect(loggerMock.error).toHaveBeenCalledWith(
      'Error updating muted field for all alerts in rule rule-123: ES connection failed'
    );
  });
});
