/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { AlertEpisode } from '../queries/episodes_query';
export interface EpisodeActionContext {
  episodes: AlertEpisode[];
  /** Optional hook for the caller to refresh their data layer after a successful execute. */
  onSuccess?: () => void;
}

export interface EpisodeActionMenuItemContext extends EpisodeActionContext {
  /** Closes the menu hosting the item, if the surface exposes a way to. */
  closeMenu?: () => void;
}

export interface EpisodeActionInlineControlContext extends EpisodeActionContext {
  /** Disables the control, for instance while the hosting surface is still loading. */
  isDisabled?: boolean;
}

export interface EpisodeAction {
  id: string;
  order: number;
  displayName: string;
  iconType: string;
  isCompatible: (ctx: EpisodeActionContext) => boolean;
  execute: (ctx: EpisodeActionContext) => Promise<void>;
  /**
   * Optional renderer for surfaces that build their own context menu. Lets an
   * action own its menu entry, for instance to anchor a nested popover to it.
   * Surfaces that can only invoke actions imperatively — inline row controls,
   * the data table's bulk menu — fall back to `execute`.
   */
  renderMenuItem?: (ctx: EpisodeActionMenuItemContext) => ReactNode;
  /**
   * Optional renderer for surfaces that host the action as a standalone control
   * rather than a menu entry, such as an info block in the details flyout header.
   * The action owns both the anchor and the editing surface, so it can apply the
   * change in place instead of routing through the modal `execute` opens.
   */
  renderInlineControl?: (ctx: EpisodeActionInlineControlContext) => ReactNode;
  showWhenDisabled?: (ctx: EpisodeActionContext) => boolean;
  disabledTooltip?: string;
}
