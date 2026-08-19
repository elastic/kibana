/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplate } from '@kbn/agent-builder-common';

/**
 * Runner-scoped read view of the conversation-template registry.
 *
 * Structurally identical to `ConversationTemplatesStart` today, but kept
 * nominally distinct so the runner-side surface can diverge later without
 * touching the public plugin contract (mirrors AttachmentsService vs
 * AttachmentsSetup).
 */
export interface ConversationTemplatesService {
  get(id: string): Promise<ConversationTemplate | undefined>;
  list(): Promise<ConversationTemplate[]>;
}
