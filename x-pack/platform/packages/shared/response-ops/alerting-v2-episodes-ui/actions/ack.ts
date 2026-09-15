/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkAckEpisodeActionItem } from '@kbn/alerting-v2-schemas';
import type { EpisodeActionExtension } from '../types/episode_data_source';
import type { EpisodeAction } from './types';
import { bulkAckEpisodeActions } from './bulk_create_alert_actions';
import {
  createCompositeEpisodeAction,
  type CompositeActionDeps,
} from './create_composite_episode_action';
import * as i18n from './translations';

export const createAckAction = (
  deps: CompositeActionDeps,
  extension?: EpisodeActionExtension
): EpisodeAction =>
  createCompositeEpisodeAction(
    {
      id: 'ALERTING_V2_ACK_EPISODE',
      order: 10,
      displayName: i18n.ACK,
      iconType: 'checkCircle',
      isCompatible: (ep) => ep.last_ack_action !== 'ack',
      execute: (eps, http) =>
        bulkAckEpisodeActions(
          http,
          eps.map((ep): BulkAckEpisodeActionItem => ({
            episode_id: ep['episode.id'],
          }))
        ),
    },
    extension,
    deps
  );
