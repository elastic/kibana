/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { storageKeys } from '../application/storage_keys';

/**
 * Width rules for the conversation details flyout, applied wherever it opens — the in-chat flyout
 * and the ones consumers open through `openConversationDetails` — so it always opens at the same
 * width.
 */
export const CONVERSATION_DETAILS_FLYOUT_DEFAULT_WIDTH = 480;
export const CONVERSATION_DETAILS_FLYOUT_MIN_WIDTH = 400;
export const CONVERSATION_DETAILS_FLYOUT_MAX_WIDTH = 640;

const clampWidth = (width: number): number =>
  Math.min(
    Math.max(Math.round(width), CONVERSATION_DETAILS_FLYOUT_MIN_WIDTH),
    CONVERSATION_DETAILS_FLYOUT_MAX_WIDTH
  );

const readStoredWidth = (): number | undefined => {
  const raw = localStorage.getItem(storageKeys.conversationDetailsFlyoutWidth);
  const stored = raw === null ? NaN : Number(raw);
  return Number.isFinite(stored) ? clampWidth(stored) : undefined;
};

/** Remembers the width the user dragged the details flyout to. */
export const persistConversationDetailsFlyoutWidth = (width: number): void => {
  localStorage.setItem(storageKeys.conversationDetailsFlyoutWidth, String(clampWidth(width)));
};

export interface ConversationDetailsFlyoutWidthProps {
  size: number;
  minWidth: number;
  maxWidth: number;
  resizable: true;
  onResize: (width: number) => void;
}

/**
 * `EuiFlyout` width props for a conversation details flyout: always resizable, opening at the
 * width the user last chose anywhere, or at the default.
 */
export const getConversationDetailsFlyoutWidthProps = (): ConversationDetailsFlyoutWidthProps => ({
  size: readStoredWidth() ?? CONVERSATION_DETAILS_FLYOUT_DEFAULT_WIDTH,
  minWidth: CONVERSATION_DETAILS_FLYOUT_MIN_WIDTH,
  maxWidth: CONVERSATION_DETAILS_FLYOUT_MAX_WIDTH,
  resizable: true,
  onResize: persistConversationDetailsFlyoutWidth,
});
