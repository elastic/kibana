/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_EPISODE_STATUS,
  type BulkDeactivateEpisodeActionItem,
} from '@kbn/alerting-v2-schemas';
import type { EpisodeActionExtension } from '../types/episode_data_source';
import type { EpisodeAction } from './types';
import { bulkDeactivateEpisodeActions } from './bulk_create_alert_actions';
import {
  createCompositeEpisodeAction,
  type CompositeActionDeps,
} from './create_composite_episode_action';
import * as i18n from './translations';

export const createResolveAction = (
  deps: CompositeActionDeps,
  extension?: EpisodeActionExtension
): EpisodeAction => ({
  ...createCompositeEpisodeAction(
    {
      id: 'ALERTING_V2_RESOLVE_EPISODE',
      order: 30,
      displayName: i18n.RESOLVE,
      iconType: 'check',
      isCompatible: (ep) => ep['episode.status'] !== ALERT_EPISODE_STATUS.INACTIVE,
      execute: (episodes, http) =>
        bulkDeactivateEpisodeActions(
          http,
          episodes.map((ep): BulkDeactivateEpisodeActionItem => ({
            episode_id: ep['episode.id'],
            reason: i18n.RESOLVE_ACTION_REASON,
          }))
        ),
    },
    extension,
    deps
  ),
});
