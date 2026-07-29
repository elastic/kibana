/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * We exclude `@kbn/eslint/scout_require_api_client_in_api_test` for this spec
 * because we are not testing an HTTP endpoint — we drive RulesClient mutations
 * via `apiServices` and assert the change-history documents persisted to
 * `.kibana_change_history`. Side-effect assertions go through `apiServices`,
 * which is the right tool here.
 */

/* eslint-disable @kbn/eslint/scout_require_api_client_in_api_test */

import type { ChangeHistoryDocument } from '@kbn/change-history';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { isUndefined, omitBy } from 'lodash';
import { RuleChangesHistoryAction } from '../../../../server/lib/rule_changes_history/audit_actions';
import { apiTest, buildCreateRuleData } from '../fixtures';

const expectSnapshotShape = (doc: ChangeHistoryDocument, expectedRule: RuleResponse): void => {
  const snapshot = doc.object.snapshot as Partial<RuleResponse>;

  expect(snapshot).toMatchObject(
    omitBy(
      {
        id: expectedRule.id,
        kind: expectedRule.kind,
        enabled: expectedRule.enabled,
        time_field: expectedRule.time_field,
        metadata: expectedRule.metadata,
        schedule: expectedRule.schedule,
        query: expectedRule.query,
        recovery_strategy: expectedRule.recovery_strategy,
        no_data_strategy: expectedRule.no_data_strategy,
        state_transition: expectedRule.state_transition,
        grouping: expectedRule.grouping,
        artifacts: expectedRule.artifacts,
        createdBy: expectedRule.createdBy,
        createdAt: expectedRule.createdAt,
        updatedBy: expectedRule.updatedBy,
        updatedAt: expectedRule.updatedAt,
      },
      isUndefined
    )
  );

  // Cover the full payload shape so significant schema drift fails loudly.
  expect(snapshot).toMatchObject(expectedRule);
};

const expectSequences = (entries: ChangeHistoryDocument[], expected: number[]): void => {
  expect(entries.map((entry) => entry.object.sequence)).toStrictEqual(expected);
};

apiTest.describe('Rule change history', { tag: tags.stateful.classic }, () => {
  apiTest.beforeAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
    await apiServices.alertingV2.ruleChangesHistory.cleanUp();
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
    await apiServices.alertingV2.ruleChangesHistory.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
    await apiServices.alertingV2.ruleChangesHistory.cleanUp();
  });

  apiTest(
    'create: logs a rule_create entry with sequence 1 and a RuleResponse-shaped snapshot',
    async ({ apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'change-history-create' },
          schedule: { every: '1d' },
        })
      );

      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(1, {
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleCreate,
      });

      const entries = await apiServices.alertingV2.ruleChangesHistory.find({
        ruleId: created.id,
      });

      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        event: {
          action: RuleChangesHistoryAction.ruleCreate,
          type: 'creation',
          module: 'alerting-v2',
          dataset: 'rules',
        },
        object: {
          id: created.id,
          type: 'alerting_rule',
          sequence: 1,
        },
      });
      expect(entries[0].object.sequence).toBe(created.metadata.version);
      expectSnapshotShape(entries[0], created);
      expectSequences(entries, [1]);
    }
  );

  apiTest(
    'update: logs a rule_update entry with sequence 2 and the post-change snapshot',
    async ({ apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'change-history-update-original' },
          schedule: { every: '1d' },
        })
      );

      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(1, {
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleCreate,
      });

      // Upsert (PUT) exercises the update path that emits `ruleUpdated` — the
      // rules API service has no dedicated PATCH helper, and both update and
      // upsert-update emit the same change-history action.
      const updated = await apiServices.alertingV2.rules.upsert(
        created.id,
        buildCreateRuleData({
          metadata: { name: 'change-history-update-renamed' },
          schedule: { every: '12h' },
        })
      );

      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(1, {
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleUpdate,
      });

      const updateEntries = await apiServices.alertingV2.ruleChangesHistory.find({
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleUpdate,
      });

      expect(updateEntries).toHaveLength(1);
      expect(updateEntries[0]).toMatchObject({
        event: {
          action: RuleChangesHistoryAction.ruleUpdate,
          type: 'change',
        },
        object: {
          id: created.id,
          sequence: 2,
        },
      });
      expect(updateEntries[0].object.sequence).toBe(updated.metadata.version);
      expectSnapshotShape(updateEntries[0], updated);

      // Snapshot must reflect the post-change state, not the pre-change one.
      expect(updateEntries[0].object.snapshot).toMatchObject({
        metadata: { name: 'change-history-update-renamed' },
        schedule: { every: '12h' },
      });
      expect(updateEntries[0].object.snapshot).not.toMatchObject({
        metadata: { name: 'change-history-update-original' },
      });

      const allEntries = await apiServices.alertingV2.ruleChangesHistory.find({
        ruleId: created.id,
      });
      expectSequences(allEntries, [1, 2]);
    }
  );

  apiTest(
    'upsert (create): logs a rule_create entry when the rule does not yet exist',
    async ({ apiServices }) => {
      const ruleId = 'rule-history-upsert-create';
      const created = await apiServices.alertingV2.rules.upsert(
        ruleId,
        buildCreateRuleData({
          metadata: { name: 'change-history-upsert-create' },
          schedule: { every: '1d' },
        })
      );

      expect(created.id).toBe(ruleId);

      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(1, {
        ruleId,
        action: RuleChangesHistoryAction.ruleCreate,
      });

      const entries = await apiServices.alertingV2.ruleChangesHistory.find({ ruleId });

      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        event: {
          action: RuleChangesHistoryAction.ruleCreate,
          type: 'creation',
        },
        object: {
          id: ruleId,
          sequence: 1,
        },
      });
      expectSnapshotShape(entries[0], created);
      expectSequences(entries, [1]);
    }
  );

  apiTest(
    'upsert (update): logs a rule_update entry when the rule already exists',
    async ({ apiServices }) => {
      const ruleId = 'rule-history-upsert-update';
      const created = await apiServices.alertingV2.rules.upsert(
        ruleId,
        buildCreateRuleData({
          metadata: { name: 'change-history-upsert-original' },
          schedule: { every: '1d' },
        })
      );

      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(1, {
        ruleId,
        action: RuleChangesHistoryAction.ruleCreate,
      });

      const updated = await apiServices.alertingV2.rules.upsert(
        ruleId,
        buildCreateRuleData({
          metadata: { name: 'change-history-upsert-changed' },
          schedule: { every: '6h' },
        })
      );

      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(1, {
        ruleId,
        action: RuleChangesHistoryAction.ruleUpdate,
      });

      const updateEntries = await apiServices.alertingV2.ruleChangesHistory.find({
        ruleId,
        action: RuleChangesHistoryAction.ruleUpdate,
      });

      expect(updateEntries).toHaveLength(1);
      expect(updateEntries[0]).toMatchObject({
        event: {
          action: RuleChangesHistoryAction.ruleUpdate,
          type: 'change',
        },
        object: {
          id: ruleId,
          sequence: 2,
        },
      });
      expect(updateEntries[0].object.sequence).toBe(updated.metadata.version);
      expectSnapshotShape(updateEntries[0], updated);
      expect(updateEntries[0].object.snapshot).toMatchObject({
        metadata: { name: 'change-history-upsert-changed' },
        schedule: { every: '6h' },
      });

      const allEntries = await apiServices.alertingV2.ruleChangesHistory.find({ ruleId });
      expectSequences(allEntries, [1, 2]);
      expect(created.metadata.version).toBe(1);
      expect(updated.metadata.version).toBe(2);
    }
  );

  apiTest(
    'disable: logs a rule_disable entry with sequence 2 and enabled: false in the snapshot',
    async ({ apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'change-history-disable' },
          schedule: { every: '1d' },
        })
      );

      expect(created.enabled).toBe(true);

      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(1, {
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleCreate,
      });

      // Single-rule enable/disable helpers are not on the rules API service;
      // bulkDisable hits the same RulesClient path that emits `ruleDisabled`.
      await apiServices.alertingV2.rules.bulkDisable({ ids: [created.id] });
      await apiServices.alertingV2.rules.waitForEnabledState({
        id: created.id,
        enabled: false,
      });

      const disabled = await apiServices.alertingV2.rules.get(created.id);

      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(1, {
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleDisable,
      });

      const disableEntries = await apiServices.alertingV2.ruleChangesHistory.find({
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleDisable,
      });

      expect(disableEntries).toHaveLength(1);
      expect(disableEntries[0]).toMatchObject({
        event: {
          action: RuleChangesHistoryAction.ruleDisable,
          type: 'change',
        },
        object: {
          id: created.id,
          sequence: 2,
        },
      });
      expect(disableEntries[0].object.sequence).toBe(disabled.metadata.version);
      // Bulk enable/disable emit without the SO OCC `version` token.
      const { version: _occVersion, ...disabledSnapshot } = disabled;
      expectSnapshotShape(disableEntries[0], disabledSnapshot);
      expect(disableEntries[0].object.snapshot).toMatchObject({ enabled: false });

      const allEntries = await apiServices.alertingV2.ruleChangesHistory.find({
        ruleId: created.id,
      });
      expectSequences(allEntries, [1, 2]);
    }
  );

  apiTest(
    'enable: logs a rule_enable entry with sequence 3 and enabled: true in the snapshot',
    async ({ apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'change-history-enable' },
          schedule: { every: '1d' },
        })
      );

      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(1, {
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleCreate,
      });

      // Create always yields an enabled rule; disable first so bulkEnable
      // actually mutates and emits `ruleEnabled` (already-enabled rules are
      // short-circuited without a history write).
      await apiServices.alertingV2.rules.bulkDisable({ ids: [created.id] });
      await apiServices.alertingV2.rules.waitForEnabledState({
        id: created.id,
        enabled: false,
      });
      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(1, {
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleDisable,
      });

      await apiServices.alertingV2.rules.bulkEnable({ ids: [created.id] });
      await apiServices.alertingV2.rules.waitForEnabledState({
        id: created.id,
        enabled: true,
      });

      const enabled = await apiServices.alertingV2.rules.get(created.id);

      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(1, {
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleEnable,
      });

      const enableEntries = await apiServices.alertingV2.ruleChangesHistory.find({
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleEnable,
      });

      expect(enableEntries).toHaveLength(1);
      expect(enableEntries[0]).toMatchObject({
        event: {
          action: RuleChangesHistoryAction.ruleEnable,
          type: 'change',
        },
        object: {
          id: created.id,
          sequence: 3,
        },
      });
      expect(enableEntries[0].object.sequence).toBe(enabled.metadata.version);
      // Bulk enable/disable emit without the SO OCC `version` token.
      const { version: _occVersion, ...enabledSnapshot } = enabled;
      expectSnapshotShape(enableEntries[0], enabledSnapshot);
      expect(enableEntries[0].object.snapshot).toMatchObject({ enabled: true });

      const allEntries = await apiServices.alertingV2.ruleChangesHistory.find({
        ruleId: created.id,
      });
      expectSequences(allEntries, [1, 2, 3]);
    }
  );

  apiTest(
    'delete: logs a rule_delete entry with a bumped sequence and a pre-delete snapshot',
    async ({ apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'change-history-delete' },
          schedule: { every: '1d' },
        })
      );

      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(1, {
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleCreate,
      });

      // Capture state before delete: RulesClient stamps getNextVersion onto the
      // emitted snapshot (nothing is persisted on delete), so sequence advances
      // past the last stored metadata.version.
      const beforeDelete = await apiServices.alertingV2.rules.get(created.id);
      const expectedDeleteSequence = beforeDelete.metadata.version + 1;

      await apiServices.alertingV2.rules.delete(created.id);

      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(1, {
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleDelete,
      });

      const deleteEntries = await apiServices.alertingV2.ruleChangesHistory.find({
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleDelete,
      });

      expect(deleteEntries).toHaveLength(1);
      expect(deleteEntries[0]).toMatchObject({
        event: {
          action: RuleChangesHistoryAction.ruleDelete,
          type: 'deletion',
        },
        object: {
          id: created.id,
          sequence: expectedDeleteSequence,
        },
      });

      // Snapshot is the pre-delete rule with the bumped configuration version.
      // OCC `version` is not stamped on the delete emission.
      const { version: _occVersion, metadata, ...beforeDeleteSnapshot } = beforeDelete;
      expectSnapshotShape(deleteEntries[0], {
        ...beforeDeleteSnapshot,
        metadata: { ...metadata, version: expectedDeleteSequence },
      });

      const allEntries = await apiServices.alertingV2.ruleChangesHistory.find({
        ruleId: created.id,
      });
      expectSequences(allEntries, [1, expectedDeleteSequence]);
    }
  );
});
