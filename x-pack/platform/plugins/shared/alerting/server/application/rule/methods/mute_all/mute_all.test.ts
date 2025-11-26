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

const loggerErrorMock = jest.fn();
const getBulkMock = jest.fn();
const muteAllAlertsMock = jest.fn();

const savedObjectsMock = savedObjectsRepositoryMock.create();
savedObjectsMock.get = jest.fn().mockResolvedValue({
  id: 'rule-123',
  type: RULE_SAVED_OBJECT_TYPE,
  references: [],
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
    expect(savedObjectsMock.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      'rule-123',
      expect.objectContaining({
        muteAll: true,
        mutedInstanceIds: [],
      }),
      { version: '9.0.0' }
    );
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
    expect(savedObjectsMock.update).toHaveBeenCalled();
  });

  it('should clear mutedInstanceIds when muting all alerts', async () => {
    const realDate = Date;
    const isoDate = '2025-11-18T12:34:56.789Z';
    // @ts-expect-error we can mock Date
    global.Date = class extends realDate {
      constructor() {
        super(isoDate);
      }
    };
    jest.spyOn(context, 'getUserName').mockResolvedValue('test_user');
    savedObjectsMock.get.mockResolvedValue({
      type: RULE_SAVED_OBJECT_TYPE,
      id: 'rule-123',
      references: [],
      attributes: {
        actions: [],
        alertTypeId: 'test-type',
        mutedInstanceIds: ['instance-1', 'instance-2'],
      },
      version: '9.0.0',
    });
    const validParams = {
      id: 'rule-123',
    };

    await muteAll(context, validParams);

    expect(savedObjectsMock.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      'rule-123',
      expect.objectContaining({
        muteAll: true,
        mutedInstanceIds: [],
      }),
      { version: '9.0.0' }
    );
    global.Date = realDate;
  });

  it('throws error when alertsService fails but rule is still updated', async () => {
    const loggerMock = loggingSystemMock.create().get();
    const muteAllAlertsErrorMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('ES connection failed'));
    const contextWithLogger = {
      ...context,
      logger: loggerMock,
      getAlertIndicesAlias: jest.fn().mockReturnValue(['.alerts-default']),
      alertsService: {
        muteAllAlerts: muteAllAlertsErrorMock,
      },
    } as unknown as RulesClientContext;
    const validParams = {
      id: 'rule-123',
    };

    await expect(muteAll(contextWithLogger, validParams)).rejects.toThrow('ES connection failed');
    // Rule is updated first, before ES call fails
    expect(savedObjectsMock.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      'rule-123',
      expect.objectContaining({
        muteAll: true,
        mutedInstanceIds: [],
      }),
      { version: '9.0.0' }
    );
  });
});
