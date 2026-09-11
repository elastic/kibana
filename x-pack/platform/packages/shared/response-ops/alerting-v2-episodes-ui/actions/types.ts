/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
export interface EpisodeActionContext {
  episodes: AlertEpisode[];
  /** Optional hook for the caller to refresh their data layer after a successful execute. */
  onSuccess?: () => void;
}

export interface EpisodeActionMenuItemContext extends EpisodeActionContext {
  /** Closes the menu hosting the item, if the surface exposes a way to. */
  closeMenu?: () => void;
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
}
