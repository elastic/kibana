/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A one-shot request to replace the composer editor content.
 *
 * The {@link key} is monotonically incremented every time
 * {@link ConversationContextValue.setComposerContent} is invoked, so the
 * {@link ConversationInput} effect re-runs even when a consumer re-submits the
 * exact same {@link text}.
 *
 * Lifecycle:
 * 1. A consumer (e.g. an attachment renderer "Continue the conversation" chip)
 *    calls `setComposerContent(text)`.
 * 2. The provider stores `{ key: prevKey + 1, text }` on the conversation
 *    context as `composerInjection`.
 * 3. `ConversationInput` watches `composerInjection`, applies `text` to the
 *    editor, focuses it, and calls `acknowledgeComposerInjection()` to clear.
 */
export interface ComposerInjection {
  key: number;
  text: string;
}
