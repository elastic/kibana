/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { BulkResponse } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '../queries/episodes_query';
import type { EpisodeActionExtension } from '../types/episode_data_source';
import type { EpisodeAction } from './types';
import { executeCompositeAction } from './execute_composite_action';
import * as i18n from './translations';

export interface CompositeActionDef {
  id: string;
  order: number;
  displayName: string;
  iconType: string;
  isCompatible: (ep: AlertEpisode) => boolean;
  execute: (episodes: AlertEpisode[], http: HttpStart) => Promise<BulkResponse | null>;
}

export interface CompositeActionDeps {
  http: HttpStart;
  notifications: NotificationsStart;
}

/** Creates an EpisodeAction that handles both native and source-owned episodes. */
export const createCompositeEpisodeAction = (
  def: CompositeActionDef,
  extension: EpisodeActionExtension | undefined,
  deps: CompositeActionDeps
): EpisodeAction => {
  const isEligible = (ep: AlertEpisode): boolean =>
    ep.source_id == null ? def.isCompatible(ep) : extension?.isCompatible(ep) ?? false;

  return {
    id: def.id,
    order: def.order,
    displayName: def.displayName,
    iconType: def.iconType,
    isCompatible: ({ episodes }) => episodes.some(isEligible),
    execute: async ({ episodes, onSuccess }) => {
      const eligible = episodes.filter(isEligible);
      if (!eligible.length) return;

      try {
        await executeCompositeAction({
          episodes: eligible,
          nativeExecute: def.execute,
          extension,
          deps,
        });
        onSuccess?.();
      } catch {
        deps.notifications.toasts.addDanger(i18n.BULK_ERROR_TOAST);
      }
    },
  };
};
