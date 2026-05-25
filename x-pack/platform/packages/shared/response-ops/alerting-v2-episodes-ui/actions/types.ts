/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEpisode } from '../queries/episodes_query';

export interface EpisodeActionContext {
  episodes: AlertEpisode[];
  /** Optional hook for the caller to refresh their data layer after a successful execute. */
  onSuccess?: () => void;
}

export interface EpisodeAction {
  id: string;
  order: number;
  displayName: string;
  iconType: string;
  isCompatible: (ctx: EpisodeActionContext) => boolean;
  execute: (ctx: EpisodeActionContext) => Promise<void>;
}
