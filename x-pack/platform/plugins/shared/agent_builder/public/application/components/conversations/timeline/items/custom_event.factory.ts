/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ConversationEvent, EventActorType } from '@kbn/agent-builder-common';

export const CUSTOM_EVENT_TYPE = 'text_note';

export interface CustomEventData {
  title?: string;
  text: string;
}

export const createCustomEvent = (
  overrides?: Partial<ConversationEvent<string, CustomEventData>>
): ConversationEvent<string, CustomEventData> => ({
  id: 'custom-event-1',
  type: CUSTOM_EVENT_TYPE,
  created_at: '2026-09-03T11:17:55.000Z',
  actor: { type: EventActorType.user, id: 'user-1', username: 'elastic' },
  data: { title: 'Triage', text: 'Escalated to the on-call engineer.' },
  ...overrides,
});
