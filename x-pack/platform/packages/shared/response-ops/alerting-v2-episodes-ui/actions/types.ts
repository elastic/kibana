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
  /** Surface hosting the menu: a table row menu or the details flyout footer menu. */
  surface?: 'row_menu' | 'details_flyout';
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
  /**
   * The reason why the action cannot run on the current bulk selection, or `undefined` when it
   * can. Renders it disabled with the reason as its tooltip. A reason shows the action even when
   * `isCompatible` is false, so return one only when the action is relevant to the selection.
   */
  getBulkDisabledReason?: (episodes: AlertEpisode[]) => string | undefined;
  /**
   * Whether this action is supported in multi-selection bulk contexts.
   * Defaults to `true` when omitted.
   */
  supportsBulk?: boolean;
  /**
   * Whether this action is a workflow action grouped with lifecycle operations.
   */
  isWorkflowAction?: boolean;
  /**
   * Whether privileges for this action are enforced by the system it hands off
   * to, so it stays visible without alerting write privilege. Defaults to
   * `false` when omitted, which hides the action from read-only users.
   */
  enforcesOwnPrivileges?: boolean;
}
