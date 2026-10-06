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
import * as i18n from './translations';

export interface ExecuteCompositeActionParams<TContext = void> {
  episodes: AlertEpisode[];
  nativeExecute: (episodes: AlertEpisode[], http: HttpStart) => Promise<BulkResponse | null>;
  extension?: EpisodeActionExtension<TContext>;
  extensionContext?: TContext;
  deps: { http: HttpStart; notifications: NotificationsStart };
}

const showCombinedToast = (
  notifications: NotificationsStart,
  succeeded: number,
  failed: number
): void => {
  const total = succeeded + failed;
  if (total === 0) return;

  if (failed === 0) {
    notifications.toasts.add({
      title: i18n.getBulkSuccessToast(succeeded),
      color: 'success',
    });
  } else {
    notifications.toasts.add({
      title: i18n.getBulkPartialSuccessToast(succeeded, total),
      color: 'warning',
    });
  }
};

/** Partitions episodes by source, executes in parallel, and shows a combined toast. */
export const executeCompositeAction = async <TContext = void>({
  episodes,
  nativeExecute,
  extension,
  extensionContext,
  deps,
}: ExecuteCompositeActionParams<TContext>): Promise<void> => {
  const nativeEpisodes = episodes.filter((ep) => ep.source_id == null);
  const sourceEpisodes = extension
    ? episodes.filter((ep) => ep.source_id != null && extension.isCompatible(ep))
    : [];

  const [nativeSettled, sourceSettled] = await Promise.allSettled([
    nativeEpisodes.length > 0 ? nativeExecute(nativeEpisodes, deps.http) : null,
    sourceEpisodes.length > 0
      ? extension!.execute(sourceEpisodes, deps.http, extensionContext)
      : null,
  ]);

  const nativeResult = nativeSettled.status === 'fulfilled' ? nativeSettled.value : null;
  const sourceResult = sourceSettled.status === 'fulfilled' ? sourceSettled.value : null;
  const rejectedCount =
    (nativeSettled.status === 'rejected' ? nativeEpisodes.length : 0) +
    (sourceSettled.status === 'rejected' ? sourceEpisodes.length : 0);

  const totalSucceeded = (nativeResult?.affected_count ?? 0) + (sourceResult?.succeeded ?? 0);
  const totalFailed =
    (nativeResult?.errors?.length ?? 0) + (sourceResult?.failed ?? 0) + rejectedCount;

  if (totalSucceeded === 0 && totalFailed > 0) {
    throw new Error('All composite action operations failed');
  }

  showCombinedToast(deps.notifications, totalSucceeded, totalFailed);
};
