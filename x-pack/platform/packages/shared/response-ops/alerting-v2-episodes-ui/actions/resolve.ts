/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_ACTION_TYPE, ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { EpisodeActionExtension } from '../types/episode_data_source';
import type { EpisodeAction } from './types';
import { bulkCreateAlertActions } from './bulk_create_alert_actions';
import { uniqueByGroup } from './helpers';
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
        bulkCreateAlertActions(
          http,
          uniqueByGroup(episodes).map((ep) => ({
            group_hash: ep.group_hash,
            action_type: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
            reason: i18n.RESOLVE_ACTION_REASON,
          }))
        ),
    },
    extension,
    deps
  ),
});
