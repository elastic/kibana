/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { ComposerInjection } from '../../../types/composer';

interface MessageEditorController {
  setContent: (text: string) => void;
  focus: () => void;
}

/**
 * Applies a one-shot composer injection to the message editor, then
 * acknowledges it so the context clears to `null`.
 *
 * This is intentionally NOT gated by `isNewConversation` (unlike the
 * `initialMessage` effect), because attachment UX prefills mid-conversation
 * follow-up turns.
 */
export const useComposerInjectionEffect = ({
  composerInjection,
  messageEditorController,
  acknowledgeComposerInjection,
}: {
  composerInjection: ComposerInjection | null | undefined;
  messageEditorController: MessageEditorController;
  acknowledgeComposerInjection?: () => void;
}) => {
  useEffect(() => {
    if (!composerInjection) {
      return;
    }
    messageEditorController.setContent(composerInjection.text);
    messageEditorController.focus();
    acknowledgeComposerInjection?.();
  }, [composerInjection, messageEditorController, acknowledgeComposerInjection]);
};
