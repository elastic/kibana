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
import {
  createBulkActionError,
  getErrorMessage,
  readBulkOutcome,
  type BulkActionErrorDetail,
} from './helpers';
import * as i18n from './translations';

export interface ExecuteCompositeActionParams<TContext = void> {
  episodes: AlertEpisode[];
  nativeExecute: (episodes: AlertEpisode[], http: HttpStart) => Promise<BulkResponse | null>;
  extension?: EpisodeActionExtension<TContext>;
  extensionContext?: TContext;
  actionName: string;
  onSuccess?: () => void;
  deps: { http: HttpStart; notifications: NotificationsStart };
}

const showCombinedToast = (
  notifications: NotificationsStart,
  actionName: string,
  succeeded: number,
  failed: number,
  errors: BulkActionErrorDetail[]
): void => {
  const total = succeeded + failed;
  if (total === 0) return;

  if (failed === 0) {
    notifications.toasts.add({
      title: i18n.getBulkSuccessToast(succeeded),
      color: 'success',
    });
  } else {
    const uniqueMessages = [...new Set(errors.map(({ message }) => message))];
    notifications.toasts.addError(createBulkActionError(errors, failed), {
      title:
        succeeded === 0
          ? i18n.getBulkTotalFailureToast(actionName, failed)
          : i18n.getBulkPartialFailureToast(actionName, failed),
      toastMessage: i18n.getBulkFailureReason(
        uniqueMessages[0],
        Math.max(uniqueMessages.length - 1, 0)
      ),
    });
  }
};

const errorsForEpisodes = (episodes: AlertEpisode[], error: unknown): BulkActionErrorDetail[] =>
  episodes.map((episode) => ({ id: episode['episode.id'], message: getErrorMessage(error) }));

/** Partitions episodes by source, executes in parallel, and shows a combined toast. */
export const executeCompositeAction = async <TContext = void>({
  episodes,
  nativeExecute,
  extension,
  extensionContext,
  actionName,
  onSuccess,
  deps,
}: ExecuteCompositeActionParams<TContext>): Promise<void> => {
  const nativeEpisodes = episodes.filter((ep) => ep.source_id == null);
  const sourceEpisodes = extension
    ? episodes.filter((ep) => ep.source_id != null && extension.isCompatible(ep))
    : [];

  const [nativeSettled, sourceSettled] = await Promise.allSettled([
    nativeEpisodes.length > 0
      ? Promise.resolve().then(() => nativeExecute(nativeEpisodes, deps.http))
      : null,
    sourceEpisodes.length > 0
      ? Promise.resolve().then(() =>
          extension!.execute(sourceEpisodes, deps.http, extensionContext)
        )
      : null,
  ]);

  const nativeResult = nativeSettled.status === 'fulfilled' ? nativeSettled.value : null;
  const sourceResult = sourceSettled.status === 'fulfilled' ? sourceSettled.value : null;
  const rejectedCount =
    (nativeSettled.status === 'rejected' ? nativeEpisodes.length : 0) +
    (sourceSettled.status === 'rejected' ? sourceEpisodes.length : 0);

  const nativeOutcome = nativeResult ? readBulkOutcome(nativeResult) : null;
  const totalSucceeded = (nativeOutcome?.processed ?? 0) + (sourceResult?.succeeded ?? 0);
  const totalFailed = (nativeOutcome?.failed ?? 0) + (sourceResult?.failed ?? 0) + rejectedCount;
  const totalUnchanged = (nativeOutcome?.unchanged ?? 0) + (sourceResult?.unchanged ?? 0);
  const errors: BulkActionErrorDetail[] = [
    ...(nativeOutcome?.errors.map(({ id, error }) => ({ id, message: error.message })) ?? []),
    ...(sourceResult?.errors?.map((message) => ({ message })) ?? []),
    ...(nativeSettled.status === 'rejected'
      ? errorsForEpisodes(nativeEpisodes, nativeSettled.reason)
      : []),
    ...(sourceSettled.status === 'rejected'
      ? errorsForEpisodes(sourceEpisodes, sourceSettled.reason)
      : []),
  ];
  if (totalFailed > 0 && errors.length === 0) {
    errors.push({ message: i18n.UNKNOWN_ERROR });
  }

  if (totalSucceeded === 0 && totalFailed === 0 && totalUnchanged > 0) {
    deps.notifications.toasts.add({ title: i18n.BULK_NO_CHANGES_TOAST, color: 'success' });
    return;
  }

  showCombinedToast(deps.notifications, actionName, totalSucceeded, totalFailed, errors);
  if (totalSucceeded > 0) {
    onSuccess?.();
  }
};
