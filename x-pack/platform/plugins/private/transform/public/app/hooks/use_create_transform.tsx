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

import type {
  PutTransformsRequestSchema,
  PutTransformsResponseSchema,
} from '../../../server/routes/api_schemas/transforms';
import { addInternalBasePath } from '../../../common/constants';
import type { TransformId } from '../../../common/types/transform';
import { getErrorMessage } from '../../../common/utils/errors';

import { useAppDependencies, useToastNotifications } from '../app_dependencies';
import { ToastNotificationText } from '../components';

import { useRefreshTransformList } from './use_refresh_transform_list';

interface CreateTransformArgs {
  transformId: TransformId;
  transformConfig: PutTransformsRequestSchema;
  createDataView: boolean;
  timeFieldName?: string;
}

export const useCreateTransform = () => {
  const { http, ...startServices } = useAppDependencies();
  const refreshTransformList = useRefreshTransformList();
  const toastNotifications = useToastNotifications();

  function errorToast(error: unknown, { transformId }: CreateTransformArgs) {
    toastNotifications.addDanger({
      title: i18n.translate('xpack.transform.stepCreateForm.createTransformErrorMessage', {
        defaultMessage: 'An error occurred creating the transform {transformId}:',
        values: { transformId },
      }),
      text: toMountPoint(<ToastNotificationText text={getErrorMessage(error)} />, startServices),
    });
  }

  const mutation = useMutation({
    mutationFn: ({
      transformId,
      transformConfig,
      createDataView = false,
      timeFieldName,
    }: CreateTransformArgs) => {
      return http.put<PutTransformsResponseSchema>(
        addInternalBasePath(`transforms/${transformId}`),
        {
          query: { createDataView, timeFieldName },
          body: JSON.stringify(transformConfig),
          version: '1',
        }
      );
    },
    onError: errorToast,
    onSuccess: (resp, options) => {
      if (resp.errors.length > 0) {
        errorToast(resp.errors.length === 1 ? resp.errors[0] : resp.errors, options);
      }

      refreshTransformList();
    },
  });

  return mutation.mutate;
};
