/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { Template } from '../../../../common/types/domain/template/v1';
import { patchTemplate } from '../api/api';
import { casesQueriesKeys, casesMutationsKeys } from '../../../containers/constants';
import * as i18n from '../../templates/translations';
import type { ServerError } from '../../../types';
import { useCasesToast } from '../../../common/use_cases_toast';
import type { TemplateUpdateRequest } from '../types';

interface MutationArgs {
  templateId: string;
  template: TemplateUpdateRequest;
}

interface UseUpdateTemplateProps {
  onSuccess?: (data: Template) => void;
  disableDefaultSuccessToast?: boolean;
}

export const useUpdateTemplate = ({
  onSuccess,
  disableDefaultSuccessToast,
}: UseUpdateTemplateProps = {}) => {
  const queryClient = useQueryClient();
  const { showErrorToast, showSuccessToast } = useCasesToast();

  return useMutation<Template, ServerError, MutationArgs>(
    ({ templateId, template }) => patchTemplate({ templateId, template }),
    {
      mutationKey: casesMutationsKeys.updateTemplate,
      onSuccess: (data) => {
        queryClient.invalidateQueries(casesQueriesKeys.templates);
        if (!disableDefaultSuccessToast) {
          showSuccessToast(i18n.SUCCESS_UPDATING_TEMPLATE);
        }
        onSuccess?.(data);
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_UPDATING_TEMPLATE });
      },
    }
  );
};
