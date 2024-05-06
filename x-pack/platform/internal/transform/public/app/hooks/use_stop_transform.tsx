/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useMutation } from '@tanstack/react-query';

import { i18n } from '@kbn/i18n';

import { toMountPoint } from '@kbn/react-kibana-mount';

import { addInternalBasePath } from '../../../common/constants';
import type {
  StopTransformsRequestSchema,
  StopTransformsResponseSchema,
} from '../../../common/api_schemas/stop_transforms';
import { getErrorMessage } from '../../../common/utils/errors';

import { useAppDependencies, useToastNotifications } from '../app_dependencies';
import { ToastNotificationText } from '../components';

import { useRefreshTransformList } from './use_refresh_transform_list';

export const useStopTransforms = () => {
  const { http, i18n: i18nStart, theme } = useAppDependencies();
  const refreshTransformList = useRefreshTransformList();
  const toastNotifications = useToastNotifications();

  const mutation = useMutation({
    mutationFn: (reqBody: StopTransformsRequestSchema) =>
      http.post<StopTransformsResponseSchema>(addInternalBasePath('stop_transforms'), {
        body: JSON.stringify(reqBody),
        version: '1',
      }),
    onError: (error) =>
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.transform.transformList.stopTransformResponseSchemaErrorMessage',
          {
            defaultMessage: 'An error occurred called the stop transforms request.',
          }
        ),
        text: toMountPoint(<ToastNotificationText text={getErrorMessage(error)} />, {
          theme,
          i18n: i18nStart,
        }),
      }),
    onSuccess: (results) => {
      for (const transformId in results) {
        // hasOwnProperty check to ensure only properties on object itself, and not its prototypes
        if (results.hasOwnProperty(transformId)) {
          if (!results[transformId].success) {
            toastNotifications.addDanger(
              i18n.translate('xpack.transform.transformList.stopTransformErrorMessage', {
                defaultMessage: 'An error occurred stopping the data frame transform {transformId}',
                values: { transformId },
              })
            );
          }
        }
      }

      refreshTransformList();
    },
  });

  return mutation.mutate;
};
