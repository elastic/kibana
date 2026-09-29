/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import type { RulesClientContext } from '../../../../rules_client';
import { bulkGetRulesSo, bulkUpdateRuleSo } from '../../../../data/rule';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { retryIfBulkEditConflicts } from '../../../../rules_client/common';
import { bulkMuteUnmuteInstances } from './bulk_mute_unmute_instances';

vi.mock('../../../../data/rule', () => {
      const mocked = {
      bulkGetRulesSo: vi.fn(),
      bulkUpdateRuleSo: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
const bulkGetRulesSoMock = bulkGetRulesSo as Mock;
const bulkUpdateRuleSoMock = bulkUpdateRuleSo as Mock;

vi.mock('../../../../rules_client/common', async () => {
      const mocked = {
      ...(await vi.importActual('../../../../rules_client/common')),
      retryIfBulkEditConflicts: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
const retryIfBulkEditConflictsMock = retryIfBulkEditConflicts as Mock;

vi.mock('./transforms/transform_rule_mute_instance_ids', () => {
      const mocked = {
      transformMuteRequestToRuleAttributes: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./transforms/transform_rule_unmute_instance_ids', () => {
      const mocked = {
      transformUnmuteRequestToRuleAttributes: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('bulkMuteUnmuteInstances', () => {
  const loggerErrorMock = vi.fn();
  const unsecuredSavedObjectsClient = savedObjectsRepositoryMock.create();
  const auditLoggerMock = { log: vi.fn() };
  const authorizationMock = { bulkEnsureAuthorized: vi.fn() };
  const actionsAuthorizationMock = { ensureAuthorized: vi.fn() };
  const ruleTypeRegistryMock = { ensureRuleTypeEnabled: vi.fn() };
  const getAlertIndicesAliasMock = vi.fn().mockReturnValue(['.alerts-default']);
  const muteAlertInstancesMock = vi.fn();
  const unmuteAlertInstancesMock = vi.fn();
  const alertsServiceMock = {
    isExistingAlert: vi.fn(),
    muteAlertInstances: muteAlertInstancesMock,
    unmuteAlertInstances: unmuteAlertInstancesMock,
  };

  const context = {
    logger: { error: loggerErrorMock, debug: vi.fn() },
    unsecuredSavedObjectsClient,
    authorization: authorizationMock,
    actionsAuthorization: actionsAuthorizationMock,
    auditLogger: auditLoggerMock,
    ruleTypeRegistry: ruleTypeRegistryMock,
    getAlertIndicesAlias: getAlertIndicesAliasMock,
    getUserName: async () => 'test_user',
    alertsService: alertsServiceMock,
    spaceId: 'default',
  } as unknown as RulesClientContext;

  beforeEach(() => {
    vi.resetAllMocks();
    getAlertIndicesAliasMock.mockReturnValue(['.alerts-default']);
    retryIfBulkEditConflictsMock.mockImplementation(async (logger, description, thing) => thing());
  });

  describe('when muting', () => {
    const mute = true;

    test('should call alertsService.muteAlertInstances with the correct parameters', async () => {
      const ruleId = 'rule-1';
      const alertInstanceIds = ['instance-1', 'instance-2'];

      const rule = {
        id: ruleId,
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          alertTypeId: 'test',
          consumer: 'test',
          name: 'test rule',
        },
        references: [],
      };
      bulkGetRulesSoMock.mockResolvedValueOnce({
        saved_objects: [rule],
      });

      bulkUpdateRuleSoMock.mockResolvedValueOnce({ saved_objects: [rule] });

      await bulkMuteUnmuteInstances(context, {
        params: { rules: [{ id: ruleId, alertInstanceIds }] },
        mute,
      });

      expect(bulkGetRulesSoMock).toHaveBeenCalledWith({
        savedObjectsClient: unsecuredSavedObjectsClient,
        ids: [ruleId],
      });

      expect(authorizationMock.bulkEnsureAuthorized).toHaveBeenCalledWith({
        ruleTypeIdConsumersPairs: [{ ruleTypeId: 'test', consumers: ['test'] }],
        operation: 'muteAlert',
        entity: 'rule',
      });

      expect(bulkUpdateRuleSoMock).toHaveBeenCalled();
      expect(muteAlertInstancesMock).toHaveBeenCalledTimes(1);
      expect(muteAlertInstancesMock).toHaveBeenCalledWith({
        targets: [{ ruleId, alertInstanceIds }],
        indices: ['.alerts-default'],
        logger: context.logger,
      });
      expect(unmuteAlertInstancesMock).not.toHaveBeenCalled();
    });

    test('should re-throw an error if authorization fails', async () => {
      const ruleId = 'rule-1';
      const alertInstanceIds = ['instance-1', 'instance-2'];
      const expectedError = new Error('Not authorized');

      bulkGetRulesSoMock.mockResolvedValueOnce({
        saved_objects: [
          {
            id: ruleId,
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {
              alertTypeId: 'test',
              consumer: 'test',
              name: 'test rule',
            },
            references: [],
          },
        ],
      });
      authorizationMock.bulkEnsureAuthorized.mockRejectedValue(expectedError);

      await expect(
        bulkMuteUnmuteInstances(context, {
          params: { rules: [{ id: ruleId, alertInstanceIds }] },
          mute,
        })
      ).rejects.toThrow(expectedError);

      expect(muteAlertInstancesMock).not.toHaveBeenCalled();
    });

    test('should re-throw an error if alertsService.muteAlertInstances fails', async () => {
      const ruleId = 'rule-1';
      const alertInstanceIds = ['instance-1', 'instance-2'];
      const expectedError = new Error('Failed to mute alerts');

      const rule = {
        id: ruleId,
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          alertTypeId: 'test',
          consumer: 'test',
          name: 'test rule',
        },
        references: [],
      };
      bulkGetRulesSoMock.mockResolvedValueOnce({
        saved_objects: [rule],
      });

      bulkUpdateRuleSoMock.mockResolvedValueOnce({ saved_objects: [rule] });

      muteAlertInstancesMock.mockRejectedValue(expectedError);

      await expect(
        bulkMuteUnmuteInstances(context, {
          params: { rules: [{ id: ruleId, alertInstanceIds }] },
          mute,
        })
      ).rejects.toThrow(expectedError);
    });
  });

  describe('when unmuting', () => {
    const mute = false;

    test('should call alertsService.unmuteAlertInstances with the correct parameters', async () => {
      const ruleId = 'rule-1';
      const alertInstanceIds = ['instance-1', 'instance-2'];

      const rule = {
        id: ruleId,
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          alertTypeId: 'test',
          consumer: 'test',
          name: 'test rule',
        },
        references: [],
      };
      bulkGetRulesSoMock.mockResolvedValueOnce({
        saved_objects: [rule],
      });

      bulkUpdateRuleSoMock.mockResolvedValueOnce({ saved_objects: [rule] });

      await bulkMuteUnmuteInstances(context, {
        params: { rules: [{ id: ruleId, alertInstanceIds }] },
        mute,
      });

      expect(bulkGetRulesSoMock).toHaveBeenCalledWith({
        savedObjectsClient: unsecuredSavedObjectsClient,
        ids: [ruleId],
      });

      expect(authorizationMock.bulkEnsureAuthorized).toHaveBeenCalledWith({
        ruleTypeIdConsumersPairs: [{ ruleTypeId: 'test', consumers: ['test'] }],
        operation: 'unmuteAlert',
        entity: 'rule',
      });

      expect(bulkUpdateRuleSoMock).toHaveBeenCalled();
      expect(unmuteAlertInstancesMock).toHaveBeenCalledTimes(1);
      expect(unmuteAlertInstancesMock).toHaveBeenCalledWith({
        targets: [{ ruleId, alertInstanceIds }],
        indices: ['.alerts-default'],
        logger: context.logger,
      });
      expect(muteAlertInstancesMock).not.toHaveBeenCalled();
    });

    test('should re-throw an error if authorization fails', async () => {
      const ruleId = 'rule-1';
      const alertInstanceIds = ['instance-1', 'instance-2'];
      const expectedError = new Error('Not authorized');

      bulkGetRulesSoMock.mockResolvedValueOnce({
        saved_objects: [
          {
            id: ruleId,
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {
              alertTypeId: 'test',
              consumer: 'test',
              name: 'test rule',
            },
            references: [],
          },
        ],
      });
      authorizationMock.bulkEnsureAuthorized.mockRejectedValue(expectedError);

      await expect(
        bulkMuteUnmuteInstances(context, {
          params: { rules: [{ id: ruleId, alertInstanceIds }] },
          mute,
        })
      ).rejects.toThrow(expectedError);

      expect(unmuteAlertInstancesMock).not.toHaveBeenCalled();
    });

    test('should re-throw an error if alertsService.unmuteAlertInstances fails', async () => {
      const ruleId = 'rule-1';
      const alertInstanceIds = ['instance-1', 'instance-2'];
      const expectedError = new Error('Failed to unmute alerts');

      const rule = {
        id: ruleId,
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          alertTypeId: 'test',
          consumer: 'test',
          name: 'test rule',
        },
        references: [],
      };
      bulkGetRulesSoMock.mockResolvedValueOnce({
        saved_objects: [rule],
      });

      bulkUpdateRuleSoMock.mockResolvedValueOnce({ saved_objects: [rule] });

      unmuteAlertInstancesMock.mockRejectedValue(expectedError);

      await expect(
        bulkMuteUnmuteInstances(context, {
          params: { rules: [{ id: ruleId, alertInstanceIds }] },
          mute,
        })
      ).rejects.toThrow(expectedError);
    });
  });

  // Shared tests
  test('should throw error if rules are not found', async () => {
    const ruleId = 'rule-1';
    const alertInstanceIds = ['instance-1', 'instance-2'];

    bulkGetRulesSoMock.mockResolvedValueOnce({
      saved_objects: [],
    });

    await expect(
      bulkMuteUnmuteInstances(context, {
        params: { rules: [{ id: ruleId, alertInstanceIds }] },
        mute: true,
      })
    ).rejects.toThrow(`Rules not found: ["${ruleId}"]`);
  });

  test('should do nothing if an empty rules array is provided', async () => {
    await bulkMuteUnmuteInstances(context, { params: { rules: [] }, mute: true });

    expect(bulkGetRulesSoMock).not.toHaveBeenCalled();
    expect(authorizationMock.bulkEnsureAuthorized).not.toHaveBeenCalled();
    expect(bulkUpdateRuleSoMock).not.toHaveBeenCalled();
    expect(muteAlertInstancesMock).not.toHaveBeenCalled();
    expect(unmuteAlertInstancesMock).not.toHaveBeenCalled();
  });
});
