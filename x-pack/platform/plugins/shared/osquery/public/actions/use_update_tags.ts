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

interface UpdateTagsParams {
  actionId: string;
  tags: string[];
}

export const useUpdateTags = () => {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();
  const setErrorToast = useErrorToast();

  return useMutation(
    ({ actionId, tags }: UpdateTagsParams) =>
      http.put(`/api/osquery/live_queries/${actionId}`, {
        body: JSON.stringify({ tags }),
        version: API_VERSIONS.public.v1,
      }),
    {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries(['liveQueries', { actionId: variables.actionId }]);
        queryClient.invalidateQueries(['liveQueries']);
        setErrorToast();
      },
      onError: (error: Error) =>
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.tags.updateError', {
            defaultMessage: 'Error while updating tags',
          }),
        }),
    }
  );
};
