/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { storageKeys } from '../application/storage_keys';

/**
 * Width rules for the conversation details flyout, applied wherever it opens (Agent Builder chat,
 * Nightshift, AlertZero) so the same conversation always opens at the same width.
 */
export const CONVERSATION_DETAILS_FLYOUT_DEFAULT_WIDTH = 480;
export const CONVERSATION_DETAILS_FLYOUT_MIN_WIDTH = 400;
export const CONVERSATION_DETAILS_FLYOUT_MAX_WIDTH = 640;

const clampWidth = (width: number): number =>
  Math.min(
    Math.max(Math.round(width), CONVERSATION_DETAILS_FLYOUT_MIN_WIDTH),
    CONVERSATION_DETAILS_FLYOUT_MAX_WIDTH
  );

const readStoredWidth = (templateId?: string): number | undefined => {
  const raw = localStorage.getItem(storageKeys.getConversationDetailsFlyoutWidthKey(templateId));
  const stored = raw === null ? NaN : Number(raw);
  return Number.isFinite(stored) ? clampWidth(stored) : undefined;
};

/** Width the flyout opens at when the user has not resized it for this template yet. */
export const getConversationDetailsFlyoutDefaultWidth = (templateDefaultWidth?: number): number =>
  clampWidth(templateDefaultWidth ?? CONVERSATION_DETAILS_FLYOUT_DEFAULT_WIDTH);

/** Remembers the width the user dragged this template's details flyout to. */
export const persistConversationDetailsFlyoutWidth = (
  templateId: string | undefined,
  width: number
): void => {
  localStorage.setItem(
    storageKeys.getConversationDetailsFlyoutWidthKey(templateId),
    String(clampWidth(width))
  );
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
 * width the user last chose for this conversation template, or at the template's default.
 */
export const getConversationDetailsFlyoutWidthProps = ({
  templateId,
  templateDefaultWidth,
}: {
  templateId?: string;
  templateDefaultWidth?: number;
}): ConversationDetailsFlyoutWidthProps => ({
  size:
    readStoredWidth(templateId) ?? getConversationDetailsFlyoutDefaultWidth(templateDefaultWidth),
  minWidth: CONVERSATION_DETAILS_FLYOUT_MIN_WIDTH,
  maxWidth: CONVERSATION_DETAILS_FLYOUT_MAX_WIDTH,
  resizable: true,
  onResize: (width: number) => persistConversationDetailsFlyoutWidth(templateId, width),
});
