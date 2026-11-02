/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkUnackEpisodeActionItem } from '@kbn/alerting-v2-schemas';
import type { EpisodeActionExtension } from '../types/episode_data_source';
import type { EpisodeAction } from './types';
import { bulkUnackEpisodeActions } from './bulk_create_alert_actions';
import {
  createCompositeEpisodeAction,
  type CompositeActionDeps,
} from './create_composite_episode_action';
import * as i18n from './translations';

export const createUnackAction = (
  deps: CompositeActionDeps,
  extension?: EpisodeActionExtension
): EpisodeAction =>
  createCompositeEpisodeAction(
    {
      id: 'ALERTING_V2_UNACK_EPISODE',
      order: 11,
      displayName: i18n.UNACK,
      iconType: 'crossCircle',
      isCompatible: (ep) => ep.last_ack_action === 'ack',
      execute: (eps, http) =>
        bulkUnackEpisodeActions(
          http,
          eps.map(
            (ep): BulkUnackEpisodeActionItem => ({
              alert_id: ep['episode.id'],
            })
          )
        ),
    },
    extension,
    deps
  );
