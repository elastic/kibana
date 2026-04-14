/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import { useQueryClient, useMutation } from '@kbn/react-query';
import { QUERY_TYPE_STATS } from '@kbn/streams-schema';
import { DISCOVERY_QUERIES_QUERY_KEY } from '../../../../../hooks/sig_events/use_fetch_discovery_queries';
import { DISCOVERY_QUERIES_OCCURRENCES_QUERY_KEY } from '../../../../../hooks/sig_events/use_fetch_discovery_queries_occurrences';
import { UNBACKED_QUERIES_COUNT_QUERY_KEY } from '../../../../../hooks/sig_events/use_unbacked_queries_count';
import { useFetchErrorToast } from '../../../../../hooks/use_fetch_error_toast';
import { type SignificantEventItem } from '../../../../../hooks/sig_events/use_fetch_significant_events';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useQueriesApi } from '../../../../../hooks/sig_events/use_queries_api';
import {
  PROMOTE_QUERY_ACTION_TITLE,
  PROMOTE_QUERY_ALREADY_PROMOTED,
  PROMOTED_TOOLTIP_CONTENT,
  STATS_PROMOTE_DISABLED_TOOLTIP,
  getPromoteQuerySuccessToast,
} from './translations';

export function PromoteAction({ item }: { item: SignificantEventItem }) {
  const queryClient = useQueryClient();
  const { promote } = useQueriesApi();
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const showFetchErrorToast = useFetchErrorToast();
  const promoteMutation = useMutation({
    mutationFn: promote,
    onSuccess: (result) => {
      if (result.promoted > 0) {
        toasts.addSuccess(getPromoteQuerySuccessToast(item.query.title));
      } else if (result.skipped_stats > 0) {
        toasts.addInfo(STATS_PROMOTE_DISABLED_TOOLTIP);
      } else {
        toasts.addInfo(PROMOTE_QUERY_ALREADY_PROMOTED);
      }
      queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_OCCURRENCES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: UNBACKED_QUERIES_COUNT_QUERY_KEY });
    },
    onError: showFetchErrorToast,
  });

  const isStats = item.query.type === QUERY_TYPE_STATS;

  const label = isStats
    ? STATS_PROMOTE_DISABLED_TOOLTIP
    : item.rule_backed
    ? PROMOTED_TOOLTIP_CONTENT
    : PROMOTE_QUERY_ACTION_TITLE;

  const isDisabled = item.rule_backed || isStats || promoteMutation.isLoading;

  return (
    <EuiToolTip content={label}>
      <span>
        <EuiButtonIcon
          iconType="plusCircle"
          aria-label={label}
          isLoading={promoteMutation.isLoading}
          isDisabled={isDisabled}
          onClick={() => {
            promoteMutation.mutate({
              queryIds: [item.query.id],
            });
          }}
        />
      </span>
    </EuiToolTip>
  );
}
