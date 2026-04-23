/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { CoreStart } from '@kbn/core/public';
import type { CustomBulkActions } from '@kbn/unified-data-table';
import type { BulkCreateAlertActionBody } from '@kbn/alerting-v2-schemas';
import { ALERT_EPISODE_ACTION_TYPE, ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type {
  AlertEpisodeGroupAction,
  EpisodeActionState,
} from '@kbn/alerting-v2-episodes-ui/types/action';
import { useBulkCreateAlertActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_bulk_create_alert_actions';
import {
  getEpisodesFromDocIds,
  uniqueGroupEpisodes,
} from '@kbn/alerting-v2-episodes-ui/utils/bulk_selection';
import * as i18n from '../translations';

interface UseEpisodesBulkActionsParams {
  episodesData: AlertEpisode[] | undefined;
  episodeActionsMap: Map<string, EpisodeActionState> | undefined;
  groupActionsMap: Map<string, AlertEpisodeGroupAction> | undefined;
  http: HttpStart;
  toastNotifications: CoreStart['notifications']['toasts'];
  refetch: () => void;
}

const isEpisodeAcknowledged = (
  episode: AlertEpisode,
  episodeActionsMap: Map<string, EpisodeActionState> | undefined
) => episodeActionsMap?.get(episode['episode.id'])?.lastAckAction === ALERT_EPISODE_ACTION_TYPE.ACK;

const isGroupSnoozed = (
  episode: AlertEpisode,
  groupActionsMap: Map<string, AlertEpisodeGroupAction> | undefined
) =>
  groupActionsMap?.get(episode.group_hash)?.lastSnoozeAction === ALERT_EPISODE_ACTION_TYPE.SNOOZE;

const isGroupResolved = (
  episode: AlertEpisode,
  groupActionsMap: Map<string, AlertEpisodeGroupAction> | undefined
) =>
  groupActionsMap?.get(episode.group_hash)?.lastDeactivateAction ===
  ALERT_EPISODE_ACTION_TYPE.DEACTIVATE;

const isGroupUnresolved = (
  episode: AlertEpisode,
  groupActionsMap: Map<string, AlertEpisodeGroupAction> | undefined
) =>
  groupActionsMap?.get(episode.group_hash)?.lastDeactivateAction ===
  ALERT_EPISODE_ACTION_TYPE.ACTIVATE;

interface UseEpisodesBulkActionsResult {
  customBulkActions: CustomBulkActions;
  tableKey: number;
  pendingBulkState: { action: 'snooze' | 'tag'; selectedDocIds: string[] } | null;
  onPendingBulkClose: () => void;
  onApplyBulkSnooze: (expiry: string) => void;
  onBulkSaveTags: (tags: string[]) => void;
}

export const useEpisodesBulkActions = ({
  episodesData,
  episodeActionsMap,
  groupActionsMap,
  http,
  toastNotifications,
  refetch,
}: UseEpisodesBulkActionsParams): UseEpisodesBulkActionsResult => {
  const [pendingBulkState, setPendingBulkState] = useState<{
    action: 'snooze' | 'tag';
    selectedDocIds: string[];
  } | null>(null);
  const [tableKey, setTableKey] = useState(0);

  const { mutate: bulkMutate } = useBulkCreateAlertActions(http);

  const onBulkSuccess = useCallback(
    ({ processed, total }: { processed: number; total: number }) => {
      if (processed === total) {
        toastNotifications.addSuccess(i18n.getBulkSuccessToast(processed));
      } else {
        toastNotifications.addWarning(i18n.getBulkPartialSuccessToast(processed, total));
      }
      setTableKey((k) => k + 1);
      refetch();
    },
    [toastNotifications, refetch]
  );

  const onBulkError = useCallback(() => {
    toastNotifications.addDanger(i18n.BULK_ERROR_TOAST);
  }, [toastNotifications]);

  const onPendingBulkClose = useCallback(() => setPendingBulkState(null), []);

  const onApplyBulkSnooze = useCallback(
    (expiry: string) => {
      const items: BulkCreateAlertActionBody = uniqueGroupEpisodes(
        getEpisodesFromDocIds(pendingBulkState?.selectedDocIds ?? [], episodesData ?? [])
      ).map((ep) => ({
        group_hash: ep.group_hash,
        action_type: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
        expiry,
      })) as BulkCreateAlertActionBody;
      if (items.length) bulkMutate(items, { onSuccess: onBulkSuccess, onError: onBulkError });
    },
    [pendingBulkState, episodesData, bulkMutate, onBulkSuccess, onBulkError]
  );

  const onBulkSaveTags = useCallback(
    (tags: string[]) => {
      const items: BulkCreateAlertActionBody = uniqueGroupEpisodes(
        getEpisodesFromDocIds(pendingBulkState?.selectedDocIds ?? [], episodesData ?? [])
      ).map((ep) => ({
        group_hash: ep.group_hash,
        action_type: ALERT_EPISODE_ACTION_TYPE.TAG,
        tags,
      })) as BulkCreateAlertActionBody;
      if (items.length) bulkMutate(items, { onSuccess: onBulkSuccess, onError: onBulkError });
    },
    [pendingBulkState, episodesData, bulkMutate, onBulkSuccess, onBulkError]
  );

  const customBulkActions = useMemo<CustomBulkActions>(
    () => [
      {
        key: 'acknowledge',
        label: i18n.BULK_ACKNOWLEDGE,
        icon: 'info',
        isAvailable: ({ selectedDocIds }) => {
          const selected = getEpisodesFromDocIds(selectedDocIds, episodesData ?? []);
          return selected.some((ep) => !isEpisodeAcknowledged(ep, episodeActionsMap));
        },
        onClick: ({ selectedDocIds }) => {
          const items: BulkCreateAlertActionBody = getEpisodesFromDocIds(
            selectedDocIds,
            episodesData ?? []
          ).map((ep) => ({
            group_hash: ep.group_hash,
            action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
            episode_id: ep['episode.id'],
          })) as BulkCreateAlertActionBody;
          if (items.length) bulkMutate(items, { onSuccess: onBulkSuccess, onError: onBulkError });
        },
      },
      {
        key: 'unacknowledge',
        label: i18n.BULK_UNACKNOWLEDGE,
        icon: 'crossInCircle',
        isAvailable: ({ selectedDocIds }) => {
          const selected = getEpisodesFromDocIds(selectedDocIds, episodesData ?? []);
          return selected.some((ep) => isEpisodeAcknowledged(ep, episodeActionsMap));
        },
        onClick: ({ selectedDocIds }) => {
          const items: BulkCreateAlertActionBody = getEpisodesFromDocIds(
            selectedDocIds,
            episodesData ?? []
          ).map((ep) => ({
            group_hash: ep.group_hash,
            action_type: ALERT_EPISODE_ACTION_TYPE.UNACK,
            episode_id: ep['episode.id'],
          })) as BulkCreateAlertActionBody;
          if (items.length) bulkMutate(items, { onSuccess: onBulkSuccess, onError: onBulkError });
        },
      },
      {
        key: 'snooze',
        label: i18n.BULK_SNOOZE,
        icon: 'bellSlash',
        isAvailable: ({ selectedDocIds }) => {
          const groups = uniqueGroupEpisodes(
            getEpisodesFromDocIds(selectedDocIds, episodesData ?? [])
          );
          return groups.some((ep) => !isGroupSnoozed(ep, groupActionsMap));
        },
        onClick: ({ selectedDocIds }) => {
          setPendingBulkState({ action: 'snooze', selectedDocIds });
        },
      },
      {
        key: 'unsnooze',
        label: i18n.BULK_UNSNOOZE,
        icon: 'bell',
        isAvailable: ({ selectedDocIds }) => {
          const groups = uniqueGroupEpisodes(
            getEpisodesFromDocIds(selectedDocIds, episodesData ?? [])
          );
          return groups.some((ep) => isGroupSnoozed(ep, groupActionsMap));
        },
        onClick: ({ selectedDocIds }) => {
          const items: BulkCreateAlertActionBody = uniqueGroupEpisodes(
            getEpisodesFromDocIds(selectedDocIds, episodesData ?? [])
          ).map((ep) => ({
            group_hash: ep.group_hash,
            action_type: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE,
          })) as BulkCreateAlertActionBody;
          if (items.length) bulkMutate(items, { onSuccess: onBulkSuccess, onError: onBulkError });
        },
      },
      {
        key: 'resolve',
        label: i18n.BULK_RESOLVE,
        icon: 'check',
        isAvailable: ({ selectedDocIds }) => {
          const groups = uniqueGroupEpisodes(
            getEpisodesFromDocIds(selectedDocIds, episodesData ?? [])
          );
          return groups.some(
            (ep) =>
              !isGroupResolved(ep, groupActionsMap) &&
              ep['episode.status'] !== ALERT_EPISODE_STATUS.INACTIVE
          );
        },
        onClick: ({ selectedDocIds }) => {
          const items: BulkCreateAlertActionBody = uniqueGroupEpisodes(
            getEpisodesFromDocIds(selectedDocIds, episodesData ?? [])
          ).map((ep) => ({
            group_hash: ep.group_hash,
            action_type: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
            reason: i18n.RESOLVE_ACTION_REASON,
          })) as BulkCreateAlertActionBody;
          if (items.length) bulkMutate(items, { onSuccess: onBulkSuccess, onError: onBulkError });
        },
      },
      {
        key: 'unresolve',
        label: i18n.BULK_UNRESOLVE,
        icon: 'cross',
        isAvailable: ({ selectedDocIds }) => {
          const groups = uniqueGroupEpisodes(
            getEpisodesFromDocIds(selectedDocIds, episodesData ?? [])
          );
          return groups.some(
            (ep) =>
              !isGroupUnresolved(ep, groupActionsMap) &&
              ep['episode.status'] !== ALERT_EPISODE_STATUS.ACTIVE
          );
        },
        onClick: ({ selectedDocIds }) => {
          const items: BulkCreateAlertActionBody = uniqueGroupEpisodes(
            getEpisodesFromDocIds(selectedDocIds, episodesData ?? [])
          ).map((ep) => ({
            group_hash: ep.group_hash,
            action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
            reason: i18n.RESOLVE_ACTION_REASON,
          })) as BulkCreateAlertActionBody;
          if (items.length) bulkMutate(items, { onSuccess: onBulkSuccess, onError: onBulkError });
        },
      },
      {
        key: 'edit-tags',
        label: i18n.BULK_EDIT_TAGS,
        icon: 'tag',
        onClick: ({ selectedDocIds }) => {
          setPendingBulkState({ action: 'tag', selectedDocIds });
        },
      },
    ],
    [episodesData, episodeActionsMap, groupActionsMap, bulkMutate, onBulkSuccess, onBulkError]
  );

  return {
    customBulkActions,
    tableKey,
    pendingBulkState,
    onPendingBulkClose,
    onApplyBulkSnooze,
    onBulkSaveTags,
  };
};
