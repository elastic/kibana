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
import { PLUGIN_ID } from '../../common';
import { pagePathGetters } from '../common/page_paths';
import { SAVED_QUERIES_ID } from './constants';
import { useErrorToast } from '../common/hooks/use_error_toast';

interface UseCopySavedQueryProps {
  savedQueryId: string;
}

/**
 * Creates a server-side copy of an existing saved query and navigates to the edit page for the new copy.
 *
 * @param savedQueryId - The saved-object ID of the saved query to copy
 * @returns React Query mutation object with `mutateAsync` to trigger the copy
 *
 * Side effects:
 * - Invalidates the saved queries query cache so list views refresh
 * - Navigates to the edit page of the newly created saved query
 * - Displays a success toast notification
 */
export const useCopySavedQuery = ({ savedQueryId }: UseCopySavedQueryProps) => {
  const queryClient = useQueryClient();
  const {
    application: { navigateToApp },
    http,
    notifications: { toasts },
  } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useMutation(
    () =>
      http.post<{ data: { saved_object_id: string; id: string } }>(
        `/api/osquery/saved_queries/${savedQueryId}/copy`,
        {
          version: API_VERSIONS.public.v1,
        }
      ),
    {
      onError: (error: { body: { error: string; message: string } }) => {
        setErrorToast(error, {
          title: error.body.error,
          toastMessage: error.body.message,
        });
      },
      onSuccess: (response) => {
        queryClient.invalidateQueries([SAVED_QUERIES_ID]);
        navigateToApp(PLUGIN_ID, {
          path: pagePathGetters.saved_query_edit({
            savedQueryId: response.data.saved_object_id,
          }),
        });
        toasts.addSuccess(
          i18n.translate('xpack.osquery.editSavedQuery.copySuccessToastMessageText', {
            defaultMessage: 'Saved query duplicated successfully',
          })
        );
      },
    }
  );
};
