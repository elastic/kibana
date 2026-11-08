/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { storageKeys } from '../application/storage_keys';

/**
 * Width rules for the chat's flyouts (Summary, Sharing, Chat details and Activity log), including
 * the Summary flyout consumers open through `openConversationDetails`, so they all open at the same
 * width and share one remembered width.
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

export interface ConversationDetailsFlyoutWidthOptions {
  /**
   * The Summary flyout, which holds a template's tabs and needs room: it opens at two thirds of
   * the page, can be dragged up to nine tenths of it, and remembers its own width.
   */
  wide?: boolean;
}

const SUMMARY_FLYOUT_SHARE_OF_PAGE = 2 / 3;
const SUMMARY_FLYOUT_MAX_SHARE_OF_PAGE = 0.9;

/** Two thirds of the page: where the Summary flyout opens, and where its reset action returns to. */
export const getSummaryFlyoutDefaultWidth = (): number =>
  Math.round(window.innerWidth * SUMMARY_FLYOUT_SHARE_OF_PAGE);

const getWideWidthProps = (): ConversationDetailsFlyoutWidthProps => {
  const page = window.innerWidth;
  const maxWidth = Math.max(
    CONVERSATION_DETAILS_FLYOUT_MAX_WIDTH,
    Math.round(page * SUMMARY_FLYOUT_MAX_SHARE_OF_PAGE)
  );
  const clamp = (width: number) =>
    Math.min(Math.max(Math.round(width), CONVERSATION_DETAILS_FLYOUT_MIN_WIDTH), maxWidth);
  const raw = localStorage.getItem(storageKeys.conversationSummaryFlyoutWidth);
  const stored = raw === null ? NaN : Number(raw);
  return {
    size: Number.isFinite(stored) ? clamp(stored) : clamp(page * SUMMARY_FLYOUT_SHARE_OF_PAGE),
    minWidth: CONVERSATION_DETAILS_FLYOUT_MIN_WIDTH,
    maxWidth,
    resizable: true,
    onResize: (width) =>
      localStorage.setItem(storageKeys.conversationSummaryFlyoutWidth, String(clamp(width))),
  };
};

/**
 * `EuiFlyout` width props for a conversation details flyout: always resizable, opening at the
 * width the user last chose anywhere, or at the default.
 */
export const getConversationDetailsFlyoutWidthProps = ({
  wide = false,
}: ConversationDetailsFlyoutWidthOptions = {}): ConversationDetailsFlyoutWidthProps =>
  wide
    ? getWideWidthProps()
    : {
        size: readStoredWidth() ?? CONVERSATION_DETAILS_FLYOUT_DEFAULT_WIDTH,
        minWidth: CONVERSATION_DETAILS_FLYOUT_MIN_WIDTH,
        maxWidth: CONVERSATION_DETAILS_FLYOUT_MAX_WIDTH,
        resizable: true,
        onResize: persistConversationDetailsFlyoutWidth,
      };

/**
 * The same width props, read once when the flyout opens. EUI resets the flyout's width whenever
 * `size` changes, so reading the remembered width again on later renders would fight the user's drag.
 */
export const useConversationFlyoutWidthProps = (
  options: ConversationDetailsFlyoutWidthOptions = {}
): ConversationDetailsFlyoutWidthProps => {
  const [widthPropsAtOpen] = useState(() => getConversationDetailsFlyoutWidthProps(options));
  return widthPropsAtOpen;
};
