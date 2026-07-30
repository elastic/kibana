/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Drift-guard: ensures the `alertingV2NotificationGroup` entry in the built-in
 * workflow input definitions registry stays in sync with the canonical server types
 * (`ActionPolicyWorkflowPayload` and `AlertEpisode`).
 *
 * The `Record<keyof T, true>` maps produce a **compile error** if a field is
 * added or removed from the TS interface, making both the type and the schema
 * check mandatory on any payload change.
 */

import {
  ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID,
  builtinWorkflowInputDefinitions,
} from '@kbn/workflows';
import type { ActionPolicyWorkflowPayload, AlertEpisode } from './types';

// If `ActionPolicyWorkflowPayload` gains or loses a field, this map causes a
// TypeScript compile error — forcing the schema to be updated in lockstep.
const _payloadKeyGuard: Record<keyof ActionPolicyWorkflowPayload, true> = {
  id: true,
  policyId: true,
  groupKey: true,
  episodes: true,
  rules: true,
};

// Same guard for `AlertEpisode`.
const _episodeKeyGuard: Record<keyof AlertEpisode, true> = {
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

describe('alertingV2NotificationGroup builtin workflow input definition', () => {
  const schema =
    builtinWorkflowInputDefinitions[ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID];

  it('is registered under the expected id', () => {
    expect(schema).toBeDefined();
    expect(schema.type).toBe('object');
  });

  it('exposes exactly the ActionPolicyWorkflowPayload top-level fields', () => {
    const schemaFields = Object.keys(schema.properties ?? {}).sort();
    const typeFields = Object.keys(_payloadKeyGuard).sort();
    expect(schemaFields).toEqual(typeFields);
  });

  it('exposes exactly the AlertEpisode fields on episode items', () => {
    const episodeItems = schema.properties?.episodes?.items as {
      properties?: Record<string, unknown>;
    };
    const schemaEpisodeFields = Object.keys(episodeItems?.properties ?? {}).sort();
    const typeEpisodeFields = Object.keys(_episodeKeyGuard).sort();
    expect(schemaEpisodeFields).toEqual(typeEpisodeFields);
  });
});
