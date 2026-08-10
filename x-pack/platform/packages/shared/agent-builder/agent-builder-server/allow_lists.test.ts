/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chatAgentTypeId } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_AGENT_TYPES, isAllowedBuiltinAttachment } from './allow_lists';

describe('AGENT_BUILDER_AGENT_TYPES', () => {
  // Agent Builder's Context page derives an agent's status (On / Auto / Off) from its type,
  // assuming `chat` is the only type whose `baseConfiguration` supplies `ai_indices` (registered
  // in agents_service.ts). Base configurations are not exposed over HTTP, so the browser cannot
  // verify that itself. Pinning the allow list here means adding a new agent type fails this test,
  // prompting a check of whether the new type also needs handling in the Context page.
  // See agent_builder/public/application/hooks/ai_indices/context_status.ts.
  it('pins the allowed agent types so new ones are reviewed against the Context status derivation', () => {
    expect([...AGENT_BUILDER_AGENT_TYPES]).toEqual([
      chatAgentTypeId,
      'platform.sig_events.investigation-type',
      'platform.sig_events.discovery-type',
    ]);
  });
});

describe('isAllowedBuiltinAttachment', () => {
  it('returns true for listed attachment type ids', () => {
    expect(isAllowedBuiltinAttachment('text')).toBe(true);
    expect(isAllowedBuiltinAttachment('esql')).toBe(true);
    expect(isAllowedBuiltinAttachment('platform.dashboard.dashboard_state')).toBe(true);
    expect(isAllowedBuiltinAttachment('security.alert')).toBe(true);
    expect(isAllowedBuiltinAttachment('security.entity_graph')).toBe(true);
    expect(isAllowedBuiltinAttachment('observability.service-map')).toBe(true);
  });

  it('returns false for unlisted attachment type ids', () => {
    expect(isAllowedBuiltinAttachment('not-an-attachment')).toBe(false);
    expect(isAllowedBuiltinAttachment('')).toBe(false);
    expect(isAllowedBuiltinAttachment('security.unknown')).toBe(false);
  });
});
