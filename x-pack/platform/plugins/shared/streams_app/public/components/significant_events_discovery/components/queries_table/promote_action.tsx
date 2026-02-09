/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import { useQueryClient, useMutation } from '@kbn/react-query';
import { useFetchErrorToast } from '../../../../hooks/use_fetch_error_toast';
import { type SignificantEventItem } from '../../../../hooks/use_fetch_significant_events';
import { useQueriesApi } from '../../../../hooks/use_queries_api';
import { PROMOTE_QUERY_ACTION_TITLE } from './translations';

export function PromoteAction({ item }: { item: SignificantEventItem }) {
  const queryClient = useQueryClient();
  const { promote } = useQueriesApi();
  const showFetchErrorToast = useFetchErrorToast();
  const promoteMutation = useMutation({
    mutationFn: promote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['significantEvents'] });
      queryClient.invalidateQueries({ queryKey: ['unbackedQueriesCount'] });
    },
    onError: showFetchErrorToast,
  });

  return (
    <EuiToolTip
      content={!item.rule_backed ? PROMOTE_QUERY_ACTION_TITLE : ''}
      disableScreenReaderOutput
    >
      <EuiButtonIcon
        iconType="arrowUp"
        aria-label={PROMOTE_QUERY_ACTION_TITLE}
        isLoading={promoteMutation.isLoading}
        isDisabled={item.rule_backed || promoteMutation.isLoading}
        onClick={() => {
          promoteMutation.mutate({
            queryId: item.query.id,
            streamName: item.stream_name,
          });
        }}
      />
    </EuiToolTip>
  );
}
