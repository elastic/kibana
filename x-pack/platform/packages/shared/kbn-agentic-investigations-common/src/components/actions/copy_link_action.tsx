/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useSyncExternalStore } from 'react';
import type { EuiFlyoutMenuAction } from '@elastic/eui';
import { ACTIONS_TRANSLATIONS } from './translations';

/** Shared by every "Copy link" control so the card menu and the flyout cannot drift apart. */
export const COPY_LINK_ACTION = Object.freeze({
  iconType: 'link',
  label: ACTIONS_TRANSLATIONS.buttons.copyLink,
});

interface CopiedStore {
  get: () => boolean;
  set: (copied: boolean) => void;
  subscribe: (listener: () => void) => () => void;
}

/**
 * Carries "was it just copied" from the click to the tooltip. The flyout hands the action over as
 * plain data, so there is no component of ours to hold this state, and the tooltip's content only
 * mounts while it is showing.
 */
const createCopiedStore = (): CopiedStore => {
  let copied = false;
  const listeners = new Set<() => void>();
  return {
    get: () => copied,
    set: (next) => {
      copied = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

const CopyLinkTooltipContent = ({ store }: { store: CopiedStore }) => {
  const copied = useSyncExternalStore(store.subscribe, store.get);

  // Like `EuiCopy`, read "Copy link" again the next time the tooltip opens.
  useEffect(() => () => store.set(false), [store]);

  return <>{copied ? ACTIONS_TRANSLATIONS.tooltips.linkCopied : COPY_LINK_ACTION.label}</>;
};

/**
 * The flyout's icon-button form of the action, for Agent Builder's `trailingActions`. The card
 * menu renders the same action as a labelled menu item (see `BaseActions`).
 *
 * `onCopy` returns whether the copy worked; success is confirmed in the button's own tooltip, so
 * the caller only needs to report a failure.
 */
export const getCopyLinkFlyoutAction = (onCopy: () => boolean): EuiFlyoutMenuAction => {
  const store = createCopiedStore();
  return {
    iconType: COPY_LINK_ACTION.iconType,
    'aria-label': COPY_LINK_ACTION.label,
    toolTipContent: <CopyLinkTooltipContent store={store} />,
    onClick: () => store.set(onCopy()),
    'data-test-subj': 'investigationDetailsFlyoutCopyLink',
  };
};
