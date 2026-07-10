/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationSourceType } from '@kbn/agent-builder-common';
import { SlackSourceAdapter } from './slack/slack';
import type { ConversationSourceAdapter } from './adapter';

type SourceAdapterRegistry = {
  [T in ConversationSourceType]: ConversationSourceAdapter<T>;
};

/**
 * Resolves the {@link ConversationSourceAdapter} for a conversation source type.
 */
export const sourceAdapters: SourceAdapterRegistry = {
  [ConversationSourceType.Slack]: new SlackSourceAdapter(),
};
