/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationEventsServiceStartContract } from '@kbn/agent-builder-browser';
import { textNoteEventUiDefinition } from './text_note';

export const registerConversationEventUiDefinitions = ({
  conversationEvents,
}: {
  conversationEvents: ConversationEventsServiceStartContract;
}): void => {
  conversationEvents.register(textNoteEventUiDefinition);
};
