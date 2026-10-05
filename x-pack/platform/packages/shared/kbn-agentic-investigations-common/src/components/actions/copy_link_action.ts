/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutMenuAction } from '@elastic/eui';
import { ACTIONS_TRANSLATIONS } from './translations';

/** Shared by every "Copy link" control so the card menu and the flyout cannot drift apart. */
export const COPY_LINK_ACTION = Object.freeze({
  iconType: 'link',
  label: ACTIONS_TRANSLATIONS.buttons.copyLink,
});

/**
 * The flyout's icon-button form of the action, for Agent Builder's `trailingActions`. The card
 * menu renders the same action as a labelled menu item (see `BaseActions`).
 */
export const getCopyLinkFlyoutAction = (onClick: () => void): EuiFlyoutMenuAction => ({
  iconType: COPY_LINK_ACTION.iconType,
  'aria-label': COPY_LINK_ACTION.label,
  toolTipContent: COPY_LINK_ACTION.label,
  onClick,
  'data-test-subj': 'investigationDetailsFlyoutCopyLink',
});
