/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { patchTemplate } from './api';
import { templatesQueryKeys } from './use_get_templates';
import * as i18n from '../templates/translations';
import type { ServerError } from '../../types';
import { useCasesToast } from '../../common/use_cases_toast';
import type { TemplateUpdateRequest, Template } from './types';

interface MutationArgs {
  templateId: string;
  template: TemplateUpdateRequest;
}

export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();
  const { showErrorToast, showSuccessToast } = useCasesToast();

  return useMutation<Template, ServerError, MutationArgs>(
    ({ templateId, template }) => patchTemplate({ templateId, template }),
    {
      mutationKey: ['update-template'],
      onSuccess: () => {
        queryClient.invalidateQueries(templatesQueryKeys.all);
        showSuccessToast(i18n.SUCCESS_UPDATING_TEMPLATE);
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_UPDATING_TEMPLATE });
      },
    }
  );
};

export type UseUpdateTemplate = ReturnType<typeof useUpdateTemplate>;
