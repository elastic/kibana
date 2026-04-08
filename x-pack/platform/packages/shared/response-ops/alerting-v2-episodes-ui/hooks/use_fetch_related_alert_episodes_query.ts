/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { fetchRelatedAlertEpisodes } from '../apis/fetch_related_alert_episodes';
import { queryKeys } from '../query_keys';
import type { UseAlertingEpisodesDataViewOptions } from './use_alerting_episodes_data_view';

export interface UseFetchRelatedAlertEpisodesQueryOptions {
  ruleId: string | undefined;
  excludeEpisodeId: string | undefined;
  pageSize: number;
  services: UseAlertingEpisodesDataViewOptions['services'] & {
    expressions: ExpressionsStart;
  };
  toastDanger?: (message: string) => void;
}

/**
 * Loads aggregated episode rows for the same rule as the current episode, excluding the current id.
 */
export const useFetchRelatedAlertEpisodesQuery = ({
  ruleId,
  excludeEpisodeId,
  pageSize,
  services,
  toastDanger,
}: UseFetchRelatedAlertEpisodesQueryOptions) => {
  return useQuery({
    queryKey: queryKeys.relatedEpisodes(ruleId ?? '', excludeEpisodeId ?? '', pageSize),
    queryFn: ({ signal }) =>
      fetchRelatedAlertEpisodes({
        abortSignal: signal,
        pageSize,
        ruleId: ruleId as string,
        excludeEpisodeId: excludeEpisodeId as string,
        services,
      }),
    enabled: Boolean(ruleId && excludeEpisodeId),
    onError: () => {
      toastDanger?.(
        i18n.translate('xpack.alertingV2EpisodesUi.hooks.useFetchRelatedAlertEpisodesQuery.error', {
          defaultMessage: 'Failed to load related alert episodes',
        })
      );
    },
  });
};
