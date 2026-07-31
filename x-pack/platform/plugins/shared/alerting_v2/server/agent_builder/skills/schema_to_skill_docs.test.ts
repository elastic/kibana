/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionPolicyWorkflowPayload,
  AlertEpisode,
} from '../../lib/dispatcher/types';
import {
  generateRuleSchemaDoc,
  generateRuleOperationsDoc,
  generateActionPolicySchemaDoc,
  generateActionPolicyWorkflowPayloadDoc,
} from './schema_to_skill_docs';

/**
 * Drift-guard: if `ActionPolicyWorkflowPayload` / `AlertEpisode` gain or lose a
 * field, these maps cause a TypeScript compile error — forcing the generated
 * skill docs assertions to be updated in lockstep.
 */
const payloadKeyGuard: Record<keyof ActionPolicyWorkflowPayload, true> = {
  id: true,
  policyId: true,
  groupKey: true,
  episodes: true,
  rules: true,
};

const episodeKeyGuard: Record<keyof AlertEpisode, true> = {
  last_event_timestamp: true,
  rule_id: true,
  source: true,
  space_id: true,
  group_hash: true,
  episode_id: true,
  episode_status: true,
  severity: true,
  data: true,
};

describe('schema_to_skill_docs', () => {
  describe('generateRuleSchemaDoc', () => {
    it('matches the snapshot', () => {
      expect(generateRuleSchemaDoc()).toMatchSnapshot();
    });

    it('includes key field names from the schema', () => {
      const doc = generateRuleSchemaDoc();
      expect(doc).toContain('`kind`');
      expect(doc).toContain('`metadata`');
      expect(doc).toContain('`schedule`');
      expect(doc).toContain('`query`');
      expect(doc).toContain('`recovery_strategy`');
      expect(doc).toContain('`no_data_strategy`');
      expect(doc).toContain('`state_transition`');
    });

    it('does not contain stale field names', () => {
      const doc = generateRuleSchemaDoc();
      expect(doc).not.toContain('consecutive_breaches');
      expect(doc).not.toContain('evaluation');
      expect(doc).not.toContain('recovery_policy');
    });
  });

  describe('generateRuleOperationsDoc', () => {
    it('matches the snapshot', () => {
      expect(generateRuleOperationsDoc()).toMatchSnapshot();
    });

    it('includes all operation types', () => {
      const doc = generateRuleOperationsDoc();
      expect(doc).toContain('set_metadata');
      expect(doc).toContain('set_kind');
      expect(doc).toContain('set_schedule');
      expect(doc).toContain('set_query');
      expect(doc).toContain('set_grouping');
      expect(doc).toContain('set_state_transition');
      expect(doc).toContain('validate');
    });

    it('includes pending_count and recovering_count fields', () => {
      const doc = generateRuleOperationsDoc();
      expect(doc).toContain('pending_count');
      expect(doc).toContain('recovering_count');
    });
  });

  describe('generateActionPolicySchemaDoc', () => {
    /**
     * Snapshot of the generated skill markdown for the action policy create API
     * schema (`createActionPolicyDataSchema` from `@kbn/alerting-v2-schemas`).
     *
     * This snapshot exists so reviewers can verify the LLM-facing docs look
     * correct — field names, types, required/optional flags, descriptions, and
     * constraints. When the upstream Zod schema changes, regenerate with `-u`
     * and review the diff for accuracy before landing.
     */
    it('matches the reviewed skill-doc snapshot', () => {
      expect(generateActionPolicySchemaDoc()).toMatchSnapshot();
    });

    it('includes key field names', () => {
      const doc = generateActionPolicySchemaDoc();
      expect(doc).toContain('`name`');
      expect(doc).toContain('`destinations`');
      expect(doc).toContain('`matcher`');
      expect(doc).toContain('`groupingMode`');
      expect(doc).toContain('`throttle`');
    });
  });

  describe('generateActionPolicyWorkflowPayloadDoc', () => {
    /**
     * Snapshot of the generated skill markdown for the action-policy → workflow
     * dispatch payload (`ActionPolicyWorkflowPayload` / `AlertEpisode`).
     *
     * This snapshot exists so reviewers can verify the LLM-facing docs look
     * correct — field names, types, required/optional flags, descriptions, and
     * Liquid access guidance. When the upstream schema changes
     * (`alertingV2NotificationGroup` / dispatcher types), regenerate with
     * `-u` and review the diff for accuracy before landing.
     */
    it('matches the reviewed skill-doc snapshot', () => {
      expect(generateActionPolicyWorkflowPayloadDoc()).toMatchSnapshot();
    });

    it('documents every ActionPolicyWorkflowPayload top-level field', () => {
      const doc = generateActionPolicyWorkflowPayloadDoc();
      for (const field of Object.keys(payloadKeyGuard)) {
        expect(doc).toContain(`\`${field}\``);
      }
    });

    it('documents every AlertEpisode field', () => {
      const doc = generateActionPolicyWorkflowPayloadDoc();
      for (const field of Object.keys(episodeKeyGuard)) {
        expect(doc).toContain(`\`${field}\``);
      }
    });

    it('documents the inputs.payload Liquid access pattern', () => {
      const doc = generateActionPolicyWorkflowPayloadDoc();
      expect(doc).toContain('inputs.payload');
    });
  });
});
