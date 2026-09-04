/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';

import type {
  UpdateTransformsProjectScopeRequestSchema,
  UpdateTransformsProjectScopeResponseSchema,
} from '../../../server/routes/api_schemas/update_transforms_project_scope';
import { addInternalBasePath } from '../../../common/constants';
import { getErrorMessage } from '../../../common/utils/errors';

import { useAppDependencies, useToastNotifications } from '../app_dependencies';
import { useToastNotificationText } from '../components';

import { useRefreshTransformList } from './use_refresh_transform_list';

export const useUpdateTransformsProjectScope = () => {
  const { http } = useAppDependencies();
  const refreshTransformList = useRefreshTransformList();
  const toastNotifications = useToastNotifications();
  const getToastNotificationText = useToastNotificationText();

  const mutation = useMutation({
    mutationFn: (reqBody: UpdateTransformsProjectScopeRequestSchema) =>
      http.post<UpdateTransformsProjectScopeResponseSchema>(
        addInternalBasePath('update_transforms_project_scope'),
        {
          body: JSON.stringify(reqBody),
          version: '1',
        }
      ),
    onError: (error) =>
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.transform.transformList.updateProjectScopeGenericErrorMessage',
          {
            defaultMessage:
              'An error occurred calling the API endpoint to update transform project scope.',
          }
        ),
        ...getToastNotificationText(getErrorMessage(error), 50),
      }),
    onSuccess: (results) => {
      let successCount = 0;

      for (const transformId in results) {
        if (Object.hasOwn(results, transformId)) {
          const result = results[transformId];

          if (result.success) {
            successCount++;
          } else {
            toastNotifications.addDanger({
              title: i18n.translate(
                'xpack.transform.transformList.updateProjectScopeErrorMessage',
                {
                  defaultMessage:
                    'An error occurred updating project scope for transform {transformId}',
                  values: { transformId },
                }
              ),
              ...getToastNotificationText(result.error?.reason ?? '', 50),
            });
          }
        }
      }

      if (successCount > 0) {
        toastNotifications.addSuccess(
          i18n.translate('xpack.transform.transformList.updateProjectScopeSuccessMessage', {
            defaultMessage:
              'Saved project scope changes for {count} {count, plural, one {transform} other {transforms}}',
            values: { count: successCount },
          })
        );
      }

      refreshTransformList();
    },
  });

  return mutation.mutate;
};
