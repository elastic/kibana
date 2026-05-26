/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationDisplayStatus } from '@kbn/agent-builder-common';

export const MOCK_STATUS_CYCLE: ConversationDisplayStatus[] = [
  ConversationDisplayStatus.read,
  ConversationDisplayStatus.unread,
  ConversationDisplayStatus.inProgress,
  ConversationDisplayStatus.awaitingPrompt,
  ConversationDisplayStatus.error,
];
