/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { QueryClient } from '@kbn/react-query';
import type { BulkSnoozeSeriesActionItem } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '../queries/episodes_query';
import type { EpisodeActionExtension, EpisodeDataSource } from '../types/episode_data_source';
import type { EpisodeAction, EpisodeActionContext } from './types';
import { bulkSnoozeSeriesActions } from './bulk_create_alert_actions';
import { uniqueBySeries } from './helpers';
import { isEpisodeSnoozed } from '../utils/is_episode_snoozed';
import { executeCompositeAction } from './execute_composite_action';
import * as i18n from './translations';
import { openSnoozeModal, type EpisodeSnoozePayload } from '../components/snooze_modal';

/**
 * Flip once universal episodes can evaluate snooze conditions, mapping the
 * panel's conditions onto the v2 schema in `nativeExecute`.
 */
const NATIVE_EPISODES_SUPPORT_CONDITIONAL_SNOOZE = false;

export interface SnoozeActionDeps {
  http: HttpStart;
  overlays: OverlayStart;
  notifications: NotificationsStart;
  rendering: CoreStart['rendering'];
  queryClient: QueryClient;
  additionalDataSource?: Pick<
    EpisodeDataSource,
    'id' | 'fetchSearchFields' | 'supportsConditionalSnooze' | 'getRuleTypeIds'
  >;
}

const supportsConditions = (episodes: AlertEpisode[], sourceSupports: boolean): boolean =>
  episodes.every((ep) =>
    ep.source_id == null ? NATIVE_EPISODES_SUPPORT_CONDITIONAL_SNOOZE : sourceSupports
  );

export const createSnoozeAction = (
  deps: SnoozeActionDeps,
  extension?: EpisodeActionExtension<EpisodeSnoozePayload>
): EpisodeAction => ({
  id: 'ALERTING_V2_SNOOZE_EPISODE',
  order: 20,
  displayName: i18n.SNOOZE,
  iconType: 'bellSlash',
  isCompatible: ({ episodes }: EpisodeActionContext) =>
    episodes.some((ep) =>
      ep.source_id == null
        ? ep.series_id != null && !isEpisodeSnoozed(ep.last_snooze_action, ep.snoozed_until)
        : extension?.isCompatible(ep) ?? false
    ),
  execute: async ({ episodes, onSuccess }: EpisodeActionContext) => {
    const { additionalDataSource } = deps;
    const canUseConditions = supportsConditions(
      episodes,
      additionalDataSource?.supportsConditionalSnooze ?? false
    );

    const payload = await openSnoozeModal(deps, {
      dataSource: additionalDataSource,
      ruleTypeIds: additionalDataSource?.getRuleTypeIds?.(
        episodes.filter((ep) => ep.source_id != null)
      ),
      conditionalTabDisabledReason: canUseConditions
        ? undefined
        : i18n.CONDITIONAL_SNOOZE_UNSUPPORTED,
    });
    if (payload === undefined) return;

    const { snoozedUntil } = payload;

    await executeCompositeAction<EpisodeSnoozePayload>({
      episodes,
      nativeExecute: (eps, http) =>
        bulkSnoozeSeriesActions(
          http,
          uniqueBySeries(eps).map(
            (ep): BulkSnoozeSeriesActionItem => ({
              series_id: ep.series_id,
              ...(snoozedUntil === null ? {} : { snoozed_until: snoozedUntil }),
            })
          )
        ),
      extension,
      extensionContext: payload,
      actionName: i18n.SNOOZE,
      onSuccess,
      deps,
    });
  },
});
