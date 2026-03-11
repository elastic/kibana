/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { API_VERSIONS } from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
import { useErrorToast } from '../common/hooks/use_error_toast';
import type { LiveQueryDetailsItem } from './use_live_query_details';

interface UpdateActionTagsParams {
  actionId: string;
  tags: string[];
}

export const useUpdateActionTags = () => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();
  const queryClient = useQueryClient();

  return useMutation<{ data: { tags: string[] } }, Error, UpdateActionTagsParams>(
    ({ actionId, tags }) =>
      http.put(`/api/osquery/history/${actionId}/tags`, {
        version: API_VERSIONS.public.v1,
        body: JSON.stringify({ tags }),
      }),
    {
      onMutate: async (variables) => {
        const queryKey = ['liveQueries', { actionId: variables.actionId }];

        await queryClient.cancelQueries(queryKey);

        const previous = queryClient.getQueryData<{ data: LiveQueryDetailsItem }>(queryKey);

        if (previous) {
          queryClient.setQueryData<{ data: LiveQueryDetailsItem }>(queryKey, {
            ...previous,
            data: { ...previous.data, tags: variables.tags },
          });
        }

        return { previous, queryKey };
      },
      onSuccess: (_data, variables) => {
        setErrorToast();
        queryClient.invalidateQueries(['liveQueries', { actionId: variables.actionId }]);
        queryClient.invalidateQueries(['actions']);
        queryClient.invalidateQueries(['historyTags']);
      },
      onError: (error, _variables, context) => {
        const ctx = context as { previous?: { data: LiveQueryDetailsItem }; queryKey: string[] };
        if (ctx?.previous && ctx?.queryKey) {
          queryClient.setQueryData(ctx.queryKey, ctx.previous);
        }

        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.updateTags.fetchError', {
            defaultMessage: 'Error while updating tags',
          }),
        });
      },
    }
  );
};
