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

interface UpdateCloudConnectorRequest {
  name?: string;
}

interface CloudConnector {
  id: string;
  name: string;
  namespace?: string;
  cloudProvider: string;
  vars: Record<string, unknown>;
  packagePolicyCount: number;
  created_at: string;
  updated_at: string;
}

interface UpdateCloudConnectorResponse {
  item: CloudConnector;
}

const updateCloudConnector = async (
  http: HttpStart,
  cloudConnectorId: string,
  data: UpdateCloudConnectorRequest
): Promise<CloudConnector> => {
  const path = CLOUD_CONNECTOR_API_ROUTES.UPDATE_PATTERN.replace(
    '{cloudConnectorId}',
    cloudConnectorId
  );

  return http
    .put<UpdateCloudConnectorResponse>(path, {
      body: JSON.stringify(data),
    })
    .then((res: UpdateCloudConnectorResponse) => res.item);
};

export const useUpdateCloudConnector = (
  cloudConnectorId: string,
  onSuccess?: (connector: CloudConnector) => void,
  onError?: (error: Error) => void
) => {
  const { http, notifications } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation(
    (data: UpdateCloudConnectorRequest) => {
      if (!http) {
        throw new Error('HTTP service is not available');
      }
      return updateCloudConnector(http, cloudConnectorId, data);
    },
    {
      onSuccess: (connector) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries(['get-cloud-connectors']);
        queryClient.invalidateQueries(['cloud-connector-usage', cloudConnectorId]);

        notifications?.toasts.addSuccess({
          title: i18n.translate('xpack.fleet.cloudConnector.updateSuccess', {
            defaultMessage: 'Cloud connector updated successfully',
          }),
        });

        if (onSuccess) {
          onSuccess(connector);
        }
      },
      onError: (error: IHttpFetchError<{ message?: string }>) => {
        const serverMessage = error?.body?.message;
        const errorToDisplay = serverMessage ? new Error(serverMessage) : error;

        notifications?.toasts.addError(errorToDisplay, {
          title: i18n.translate('xpack.fleet.cloudConnector.updateError', {
            defaultMessage: 'Failed to update cloud connector',
          }),
        });

        if (onError) {
          onError(error);
        }
      },
    }
  );
};
