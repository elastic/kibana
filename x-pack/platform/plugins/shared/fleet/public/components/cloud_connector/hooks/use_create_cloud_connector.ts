/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';

import type { CloudConnector, CreateCloudConnectorRequest } from '../../../../common/types';

import { CLOUD_CONNECTOR_API_ROUTES } from '../../../constants';

const createCloudConnector = async (
  http: NonNullable<ReturnType<typeof useKibana>['services']['http']>,
  data: CreateCloudConnectorRequest
): Promise<CloudConnector> => {
  return http
    .post<{ item: CloudConnector }>(CLOUD_CONNECTOR_API_ROUTES.CREATE_PATTERN, {
      body: JSON.stringify(data),
    })
    .then((res) => res.item);
};

export const useCreateCloudConnector = (
  onSuccess?: (connector: CloudConnector) => void,
  onError?: (error: Error) => void
) => {
  const { http, notifications } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation(
    (data: CreateCloudConnectorRequest) => {
      if (!http) {
        throw new Error('HTTP service is not available');
      }
      return createCloudConnector(http, data);
    },
    {
      onSuccess: (connector) => {
        queryClient.invalidateQueries(['get-cloud-connectors']);

        notifications?.toasts.addSuccess({
          title: i18n.translate('xpack.fleet.cloudConnector.createSuccess', {
            defaultMessage: 'Federated identity created successfully',
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
          title: i18n.translate('xpack.fleet.cloudConnector.createError', {
            defaultMessage: 'Failed to create federated identity',
          }),
        });

        if (onError) {
          onError(error);
        }
      },
    }
  );
};
