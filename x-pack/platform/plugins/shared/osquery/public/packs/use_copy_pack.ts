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
import { PACKS_ID } from './constants';
import { useErrorToast } from '../common/hooks/use_error_toast';

interface UseCopyPackProps {
  packId: string;
}

/**
 * Creates a server-side copy of an existing pack and navigates to the edit page for the new copy.
 *
 * @param packId - The saved-object ID of the pack to copy
 * @returns React Query mutation object with `mutateAsync` to trigger the copy
 *
 * Side effects:
 * - Invalidates the packs query cache so list views refresh
 * - Navigates to the edit page of the newly created pack
 * - Displays a success toast notification
 * - The new pack is always created with `enabled: false`
 */
export const useCopyPack = ({ packId }: UseCopyPackProps) => {
  const queryClient = useQueryClient();
  const {
    application: { navigateToApp },
    http,
    notifications: { toasts },
  } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useMutation(
    () =>
      http.post<{ data: { saved_object_id: string; name: string } }>(
        `/api/osquery/packs/${packId}/copy`,
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
        queryClient.invalidateQueries([PACKS_ID]);
        navigateToApp(PLUGIN_ID, {
          path: pagePathGetters.pack_edit({
            packId: response.data.saved_object_id,
          }),
        });
        toasts.addSuccess(
          i18n.translate('xpack.osquery.editPack.copySuccessToastMessageText', {
            defaultMessage: 'Pack duplicated successfully',
          })
        );
      },
    }
  );
};
