/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_SAVED_OBJECT_TYPE } from '../../../..';
import { RulesClient } from '../../../../rules_client';
import { getRulesClientMockParams } from '../../../../test_utils';
import { adHocRunStatus } from '../../../../../common/constants';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import type { AdHocRunSO } from '../../../../data/ad_hoc_run/types';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { updateGaps } from '../../../../lib/rule_gaps/update/update_gaps';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';

jest.mock('../../../../lib/rule_gaps/update/update_gaps', () => ({
  updateGaps: jest.fn(),
}));

const {
  rulesClientParams,
  taskManager,
  unsecuredSavedObjectsClient,
  authorization,
  auditLogger,
  internalSavedObjectsRepository,
  logger,
  backfillClient,
} = getRulesClientMockParams({ kibanaVersion: 'v8.0.0' });

const fakeRuleName = 'fakeRuleName';

const mockAdHocRunSO: SavedObject<AdHocRunSO> = {
  id: '1',
  type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
  attributes: {
    apiKeyId: '123',
    apiKeyToUse: 'MTIzOmFiYw==',
    createdAt: '2024-01-30T00:00:00.000Z',
    duration: '12h',
    enabled: true,
    initiator: 'user',
    rule: {
      name: fakeRuleName,
      tags: ['foo'],
      alertTypeId: 'myType',
      params: {},
      actions: [],
      apiKeyOwner: 'user',
      apiKeyCreatedByUser: false,
      consumer: 'myApp',
      enabled: true,
      schedule: {
        interval: '12h',
      },
      createdBy: 'user',
      updatedBy: 'user',
      createdAt: '2019-02-12T21:01:22.479Z',
      updatedAt: '2019-02-12T21:01:22.479Z',
      revision: 0,
    },
    spaceId: 'default',
    start: '2023-10-19T15:07:40.011Z',
    status: adHocRunStatus.PENDING,
    schedule: [
      {
        interval: '12h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-10-20T03:07:40.011Z',
      },
      {
        interval: '12h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-10-20T15:07:40.011Z',
      },
    ],
  },
  references: [{ id: 'abc', name: 'rule', type: RULE_SAVED_OBJECT_TYPE }],
};

describe('deleteBackfill()', () => {
  let rulesClient: RulesClient;

  beforeEach(async () => {
    jest.clearAllMocks();
    rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValue(mockAdHocRunSO);
    unsecuredSavedObjectsClient.delete.mockResolvedValue({});
  });

  test('should successfully delete backfill by id', async () => {
    const result = await rulesClient.deleteBackfill('1');

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledWith(AD_HOC_RUN_SAVED_OBJECT_TYPE, '1');
    expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
      entity: 'rule',
      consumer: 'myApp',
      operation: 'deleteBackfill',
      ruleTypeId: 'myType',
    });
    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledWith({
      event: {
        action: 'ad_hoc_run_delete',
        category: ['database'],
        outcome: 'unknown',
        type: ['deletion'],
      },
      kibana: {
        saved_object: {
          id: '1',
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          name: 'backfill for rule "fakeRuleName"',
        },
      },
      message:
        'User is deleting ad hoc run for ad_hoc_run_params [id=1] backfill for rule "fakeRuleName"',
    });
    expect(unsecuredSavedObjectsClient.delete).toHaveBeenLastCalledWith(
      AD_HOC_RUN_SAVED_OBJECT_TYPE,
      '1',
      {
        refresh: 'wait_for',
      }
    );
    expect(taskManager.removeIfExists).toHaveBeenCalledWith('1');
    expect(logger.error).not.toHaveBeenCalled();

    expect(result).toEqual({});
  });

  test('should call updateGaps with correct parameters when deleting backfill', async () => {
    const eventLogClient = eventLogClientMock.create();
    rulesClientParams.getEventLogClient.mockResolvedValue(eventLogClient);

    await rulesClient.deleteBackfill('1');

    const updateGapsCall = (updateGaps as jest.Mock).mock.calls[0][0];
    expect(updateGapsCall.ruleId).toBe('abc');
    expect(updateGapsCall.start).toEqual(new Date('2023-10-19T15:07:40.011Z'));
    expect(updateGapsCall.end).toBeInstanceOf(Date);
    expect(updateGapsCall.backfillSchedule).toEqual([
      {
        interval: '12h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-10-20T03:07:40.011Z',
      },
      {
        interval: '12h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-10-20T15:07:40.011Z',
      },
    ]);
    expect(updateGapsCall.savedObjectsRepository).toBe(internalSavedObjectsRepository);
    expect(updateGapsCall.logger).toBe(logger);
    expect(updateGapsCall.eventLogClient).toBe(eventLogClient);
    expect(updateGapsCall.shouldRefetchAllBackfills).toBe(true);
    expect(updateGapsCall.backfillClient).toBe(backfillClient);
  });

  describe('error handling', () => {
    test('should retry if conflict error', async () => {
      unsecuredSavedObjectsClient.delete.mockImplementationOnce(() => {
        throw SavedObjectsErrorHelpers.createConflictError(AD_HOC_RUN_SAVED_OBJECT_TYPE, '1');
      });

      const result = await rulesClient.deleteBackfill('1');
      expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(2);
      expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalledTimes(2);
      expect(taskManager.removeIfExists).toHaveBeenCalledTimes(1);
      expect(result).toEqual({});
    });

    test('should throw error when getting ad hoc run saved object throws error', async () => {
      unsecuredSavedObjectsClient.get.mockImplementationOnce(() => {
        throw new Error('error getting SO!');
      });
      await expect(rulesClient.deleteBackfill('1')).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to delete backfill by id: 1: error getting SO!"`
      );
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to delete backfill by id: 1 - Error: error getting SO!`
      );
    });

    test('should throw error when user does not have access to the rule being backfilled', async () => {
      authorization.ensureAuthorized.mockImplementationOnce(() => {
        throw new Error('no access for you');
      });
      await expect(rulesClient.deleteBackfill('1')).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to delete backfill by id: 1: no access for you"`
      );
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to delete backfill by id: 1 - Error: no access for you`
      );

      expect(auditLogger.log).toHaveBeenCalledWith({
        error: { code: 'Error', message: 'no access for you' },
        event: {
          action: 'ad_hoc_run_delete',
          category: ['database'],
          outcome: 'failure',
          type: ['deletion'],
        },
        kibana: {
          saved_object: {
            id: '1',
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            name: 'backfill for rule "fakeRuleName"',
          },
        },
        message:
          'Failed attempt to delete ad hoc run for ad_hoc_run_params [id=1] backfill for rule "fakeRuleName"',
      });
    });

    test('should throw error when deleting ad hoc run saved object throws error', async () => {
      unsecuredSavedObjectsClient.delete.mockImplementationOnce(() => {
        throw new Error('error deleting SO!');
      });
      await expect(rulesClient.deleteBackfill('1')).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to delete backfill by id: 1: error deleting SO!"`
      );
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to delete backfill by id: 1 - Error: error deleting SO!`
      );
    });

    test('should throw error when removing associated task throws error', async () => {
      taskManager.removeIfExists.mockImplementationOnce(() => {
        throw new Error('error removing task!');
      });
      await expect(rulesClient.deleteBackfill('1')).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to delete backfill by id: 1: error removing task!"`
      );
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to delete backfill by id: 1 - Error: error removing task!`
      );
    });
  });
});
