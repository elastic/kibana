/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { RulesClientContext } from '../..';
import type { RawRule, RawRuleAction } from '../../../types';
import { findRules } from '../../../application/rule/methods/find/find_rules';
import { bulkDeleteRules } from '../../../application/rule/methods/bulk_delete';
import { bulkMigrateLegacyActions } from './migrate_legacy_actions';
import { deleteLegacyActionsForRules } from './find_and_transform_legacy_actions';
import type { LegacyIRuleActionsAttributes } from './types';
import { legacyRuleActionsSavedObjectType } from './types';

jest.mock('../../../application/rule/methods/find/find_rules', () => ({
  findRules: jest.fn(),
}));
jest.mock('../../../application/rule/methods/bulk_delete', () => ({
  bulkDeleteRules: jest.fn(),
}));

const RULE_ID = 'rule-1';
const SIDECAR_ID = 'sidecar-1';

const savedObjectsClient = savedObjectsClientMock.create();
const logger = loggingSystemMock.createLogger();
const context = {
  unsecuredSavedObjectsClient: savedObjectsClient,
  logger,
} as unknown as RulesClientContext;

const existingAction: RawRuleAction = {
  group: 'default',
  params: {},
  actionRef: 'action_0',
  actionTypeId: '.email',
  uuid: 'existing-uuid',
};

const buildRule = (actions: RawRuleAction[] = [], consumer = 'siem'): SavedObject<RawRule> =>
  ({
    id: RULE_ID,
    type: RULE_SAVED_OBJECT_TYPE,
    references: actions.length > 0 ? [{ name: 'action_0', type: 'action', id: 'email-1' }] : [],
    attributes: { consumer, actions, throttle: '1h', notifyWhen: 'onThrottleInterval' },
  } as unknown as SavedObject<RawRule>);

const buildSidecar = (ruleThrottle: string): SavedObject<LegacyIRuleActionsAttributes> => ({
  id: SIDECAR_ID,
  type: legacyRuleActionsSavedObjectType,
  attributes: {
    ruleThrottle,
    alertThrottle: ruleThrottle,
    actions: [
      {
        group: 'default',
        params: { message: 'legacy' },
        action_type_id: '.slack',
        actionRef: 'action_0',
      },
    ],
  },
  references: [
    { name: 'alert_0', type: RULE_SAVED_OBJECT_TYPE, id: RULE_ID },
    { name: 'action_0', type: 'action', id: 'slack-1' },
  ],
});

const mockLegacyObjects = ({
  sidecars = [],
  siemNotificationIds = [],
}: {
  sidecars?: Array<SavedObject<LegacyIRuleActionsAttributes>>;
  siemNotificationIds?: string[];
}) => {
  savedObjectsClient.find.mockResolvedValue({
    saved_objects: sidecars.map((sidecar) => ({ ...sidecar, score: 1 })),
    total: sidecars.length,
    per_page: 100,
    page: 1,
  });
  (findRules as jest.Mock).mockResolvedValue({
    data: siemNotificationIds.map((id) => ({ id })),
  });
};

describe('bulkMigrateLegacyActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    savedObjectsClient.bulkDelete.mockResolvedValue({ statuses: [] });
    (bulkDeleteRules as jest.Mock).mockResolvedValue({ rules: [], errors: [] });
  });

  it('migrates the sidecar actions into a rule without actions and does not delete the sidecar', async () => {
    mockLegacyObjects({ sidecars: [buildSidecar('1h')] });
    const rule = buildRule();

    const migratedIds = await bulkMigrateLegacyActions({
      context,
      rules: [rule],
      skipActionsValidation: true,
    });

    expect(migratedIds).toEqual([RULE_ID]);
    expect(rule.attributes.actions).toEqual([
      expect.objectContaining({
        actionRef: 'action_0',
        actionTypeId: '.slack',
        frequency: { summary: true, notifyWhen: 'onThrottleInterval', throttle: '1h' },
      }),
    ]);
    expect(rule.references).toEqual([{ name: 'action_0', type: 'action', id: 'slack-1' }]);
    expect(savedObjectsClient.bulkDelete).not.toHaveBeenCalled();
    expect(bulkDeleteRules).not.toHaveBeenCalled();
  });

  it('migrates again when the save conflicted, because the sidecar was not deleted', async () => {
    mockLegacyObjects({ sidecars: [buildSidecar('1h')] });

    // First attempt: migration succeeds in memory, then the save fails with a 409 (nothing is persisted)
    await bulkMigrateLegacyActions({
      context,
      rules: [buildRule()],
      skipActionsValidation: true,
    });

    // The retry re-reads the rule from Elasticsearch: it still has no actions
    const reReadRule = buildRule();
    const migratedIds = await bulkMigrateLegacyActions({
      context,
      rules: [reReadRule],
      skipActionsValidation: true,
    });

    expect(migratedIds).toEqual([RULE_ID]);
    expect(reReadRule.attributes.actions).toHaveLength(1);
    expect(savedObjectsClient.bulkDelete).not.toHaveBeenCalled();
  });

  it('keeps the actions of a rule that another process already migrated, and discards the leftover sidecar', async () => {
    // Process B migrated and saved first: the retry of process A reads a rule that now has actions
    mockLegacyObjects({ sidecars: [buildSidecar('1h')] });
    const rule = buildRule([existingAction]);

    const migratedIds = await bulkMigrateLegacyActions({
      context,
      rules: [rule],
      skipActionsValidation: true,
    });

    expect(migratedIds).toEqual([]);
    expect(rule.attributes.actions).toEqual([existingAction]);
    expect(rule.references).toEqual([{ name: 'action_0', type: 'action', id: 'email-1' }]);
    expect(rule.attributes.throttle).toBe('1h');
    expect(rule.attributes.notifyWhen).toBe('onThrottleInterval');
    // the rule's own actions are persisted, so deleting the sidecar right away cannot lose data
    expect(savedObjectsClient.bulkDelete).toHaveBeenCalledWith([
      { type: legacyRuleActionsSavedObjectType, id: SIDECAR_ID },
    ]);
  });

  it('does not validate or transform the sidecar of a rule that already has actions', async () => {
    // a sidecar with no connector references would make the transformation throw
    const brokenSidecar = {
      ...buildSidecar('1h'),
      references: [{ name: 'alert_0', type: RULE_SAVED_OBJECT_TYPE, id: RULE_ID }],
    };
    mockLegacyObjects({ sidecars: [brokenSidecar] });

    await expect(
      bulkMigrateLegacyActions({ context, rules: [buildRule([existingAction])] })
    ).resolves.toEqual([]);
  });

  it('defers the cleanup of a "no_actions" sidecar until the rule is saved', async () => {
    mockLegacyObjects({ sidecars: [buildSidecar('no_actions')] });
    const rule = buildRule();

    const migratedIds = await bulkMigrateLegacyActions({
      context,
      rules: [rule],
      skipActionsValidation: true,
    });

    expect(migratedIds).toEqual([RULE_ID]);
    expect(rule.attributes.actions).toEqual([]);
    expect(rule.attributes.notifyWhen).toBeNull();
    expect(savedObjectsClient.bulkDelete).not.toHaveBeenCalled();
  });

  it('does not query legacy objects for rules of other consumers', async () => {
    const migratedIds = await bulkMigrateLegacyActions({
      context,
      rules: [buildRule([], 'alerts')],
      skipActionsValidation: true,
    });

    expect(migratedIds).toEqual([]);
    expect(savedObjectsClient.find).not.toHaveBeenCalled();
    expect(findRules).not.toHaveBeenCalled();
  });

  it('does nothing when the rule has no legacy objects', async () => {
    mockLegacyObjects({});
    const rule = buildRule();

    await expect(
      bulkMigrateLegacyActions({ context, rules: [rule], skipActionsValidation: true })
    ).resolves.toEqual([]);
    expect(rule.attributes.actions).toEqual([]);
    expect(savedObjectsClient.bulkDelete).not.toHaveBeenCalled();
  });

  it('deletes the legacy notification rules of a rule that is not saved with migrated actions', async () => {
    mockLegacyObjects({ siemNotificationIds: ['notification-rule-1'] });

    await bulkMigrateLegacyActions({
      context,
      rules: [buildRule([existingAction])],
      skipActionsValidation: true,
    });

    expect(bulkDeleteRules).toHaveBeenCalledWith(context, { ids: ['notification-rule-1'] });
  });
});

describe('deleteLegacyActionsForRules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    savedObjectsClient.bulkDelete.mockResolvedValue({ statuses: [] });
    (bulkDeleteRules as jest.Mock).mockResolvedValue({ rules: [], errors: [] });
  });

  it('deletes the sidecars and the legacy notification rules that reference the rules', async () => {
    mockLegacyObjects({
      sidecars: [buildSidecar('1h')],
      siemNotificationIds: ['notification-rule-1'],
    });

    await deleteLegacyActionsForRules(context, [RULE_ID]);

    expect(savedObjectsClient.bulkDelete).toHaveBeenCalledWith([
      { type: legacyRuleActionsSavedObjectType, id: SIDECAR_ID },
    ]);
    expect(bulkDeleteRules).toHaveBeenCalledWith(context, { ids: ['notification-rule-1'] });
  });

  it('does not query anything for an empty list of rules', async () => {
    await deleteLegacyActionsForRules(context, []);

    expect(savedObjectsClient.find).not.toHaveBeenCalled();
  });

  it('logs and swallows failures: a leftover sidecar is harmless because the rule actions win', async () => {
    mockLegacyObjects({ sidecars: [buildSidecar('1h')] });
    savedObjectsClient.bulkDelete.mockRejectedValue(new Error('es down'));

    await expect(deleteLegacyActionsForRules(context, [RULE_ID])).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('es down'));
  });
});
