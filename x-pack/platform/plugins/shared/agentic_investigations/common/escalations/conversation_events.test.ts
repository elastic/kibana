/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONVERSATION_ID_MAX_LENGTH,
  CONVERSATION_TITLE_MAX_LENGTH,
  agentIdMaxLength,
} from '@kbn/agent-builder-common';
import {
  MAX_SYNCED_ATTACHMENT_IDS,
  escalationAttachmentsSyncedEventSchema,
  escalationInvestigationEventSchema,
} from './conversation_events';

const valid = { investigation_id: 'inv-1', title: 'Phishing', agent_id: 'agent-1' };

describe('escalationInvestigationEventSchema', () => {
  it('accepts a payload with and without an agent id', () => {
    expect(escalationInvestigationEventSchema.safeParse(valid).success).toBe(true);
    expect(
      escalationInvestigationEventSchema.safeParse({ investigation_id: 'inv-1', title: '' }).success
    ).toBe(true);
  });

  it.each([
    ['investigation_id', { investigation_id: 'a'.repeat(CONVERSATION_ID_MAX_LENGTH + 1) }],
    ['title', { title: 'a'.repeat(CONVERSATION_TITLE_MAX_LENGTH + 1) }],
    ['agent_id', { agent_id: 'a'.repeat(agentIdMaxLength + 1) }],
  ])('rejects an over-long %s', (_field, override) => {
    expect(escalationInvestigationEventSchema.safeParse({ ...valid, ...override }).success).toBe(
      false
    );
  });

  it('accepts values at the limits', () => {
    expect(
      escalationInvestigationEventSchema.safeParse({
        investigation_id: 'a'.repeat(CONVERSATION_ID_MAX_LENGTH),
        title: 'a'.repeat(CONVERSATION_TITLE_MAX_LENGTH),
        agent_id: 'a'.repeat(agentIdMaxLength),
      }).success
    ).toBe(true);
  });
});

describe('escalationAttachmentsSyncedEventSchema', () => {
  const synced = { ...valid, attachment_ids: ['inv-1:a'] };

  it('accepts the investigation snapshot with the synced attachment ids', () => {
    expect(escalationAttachmentsSyncedEventSchema.safeParse(synced).success).toBe(true);
  });

  it.each([
    ['missing ids', { attachment_ids: undefined }],
    ['no ids', { attachment_ids: [] }],
    ['an empty id', { attachment_ids: [''] }],
    [
      'too many ids',
      { attachment_ids: Array.from({ length: MAX_SYNCED_ATTACHMENT_IDS + 1 }, (_, i) => `a${i}`) },
    ],
  ])('rejects %s', (_name, override) => {
    expect(
      escalationAttachmentsSyncedEventSchema.safeParse({ ...synced, ...override }).success
    ).toBe(false);
  });
});
