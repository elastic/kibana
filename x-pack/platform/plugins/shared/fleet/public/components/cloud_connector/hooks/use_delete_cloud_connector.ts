/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { HttpStart, IHttpFetchError } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';

import { CLOUD_CONNECTOR_API_ROUTES } from '../../../constants';

interface DeleteCloudConnectorResponse {
  id: string;
}

const deleteCloudConnector = async (
  http: HttpStart,
  cloudConnectorId: string,
  force: boolean = false
): Promise<DeleteCloudConnectorResponse> => {
  const path = CLOUD_CONNECTOR_API_ROUTES.DELETE_PATTERN.replace(
    '{cloudConnectorId}',
    cloudConnectorId
  );

  return http.delete<DeleteCloudConnectorResponse>(path, {
    query: { force },
  });
};

export const useDeleteCloudConnector = (
  cloudConnectorId: string,
  onSuccess?: (response: DeleteCloudConnectorResponse) => void,
  onError?: (error: Error) => void
) => {
  const { http, notifications } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation(
    (options?: { force?: boolean }) => {
      if (!http) {
        throw new Error('HTTP service is not available');
      }
      return deleteCloudConnector(http, cloudConnectorId, options?.force ?? false);
    },
    {
      onSuccess: (response) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries(['get-cloud-connectors']);

        notifications?.toasts.addSuccess({
          title: i18n.translate('xpack.fleet.cloudConnector.deleteSuccess', {
            defaultMessage: 'Cloud connector deleted successfully',
          }),
        });

        if (onSuccess) {
          onSuccess(response);
        }
      },
      onError: (error: IHttpFetchError<{ message?: string }>) => {
        const serverMessage = error?.body?.message;
        const errorToDisplay = serverMessage ? new Error(serverMessage) : error;

        notifications?.toasts.addError(errorToDisplay, {
          title: i18n.translate('xpack.fleet.cloudConnector.deleteError', {
            defaultMessage: 'Failed to delete cloud connector',
          }),
        });

        if (onError) {
          onError(error);
        }
      },
    }
  );
};
