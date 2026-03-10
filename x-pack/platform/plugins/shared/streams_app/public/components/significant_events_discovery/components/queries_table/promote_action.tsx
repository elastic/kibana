/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import { useQueryClient, useMutation } from '@kbn/react-query';
import type { StreamQuery } from '@kbn/streams-schema';
import { DISCOVERY_QUERIES_QUERY_KEY } from '../../../../hooks/use_fetch_discovery_queries';
import { useFetchErrorToast } from '../../../../hooks/use_fetch_error_toast';
import { useKibana } from '../../../../hooks/use_kibana';
import { useQueriesApi } from '../../../../hooks/use_queries_api';
import { PROMOTE_QUERY_ACTION_TITLE, getPromoteQuerySuccessToast } from './translations';

export function PromoteAction({ query, unbacked }: { query: StreamQuery; unbacked: string[] }) {
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
    onSuccess: (_result, variables) => {
      const promotedQueryCount = variables.queryIds?.length ?? 0;
      if (promotedQueryCount === 1) {
        toasts.addSuccess(getPromoteQuerySuccessToast(query.title));
      }
      queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['unbackedQueriesCount'] });
    },
    onError: showFetchErrorToast,
  });
  const isBacked = !unbacked.includes(query.id);

  return (
    <EuiToolTip content={!isBacked ? PROMOTE_QUERY_ACTION_TITLE : ''} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="plusInCircle"
        aria-label={PROMOTE_QUERY_ACTION_TITLE}
        isLoading={promoteMutation.isLoading}
        isDisabled={isBacked || promoteMutation.isLoading}
        onClick={() => {
          promoteMutation.mutate({
            queryIds: [query.id],
          });
        }}
      />
    </EuiToolTip>
  );
}
