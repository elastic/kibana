/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { CreateTemplateInput, Template } from '../../../../common/types/domain/template/v1';
import { postTemplate } from '../api/api';
import { casesQueriesKeys, casesMutationsKeys } from '../../../containers/constants';
import * as i18n from '../translations';
import type { ServerError } from '../../../types';
import { useCasesToast } from '../../../common/use_cases_toast';

interface MutationArgs {
  template: CreateTemplateInput;
}

interface UseCreateTemplateProps {
  onSuccess?: (data: Template) => void;
  disableDefaultSuccessToast?: boolean;
}

export const useCreateTemplate = ({
  onSuccess,
  disableDefaultSuccessToast,
}: UseCreateTemplateProps = {}) => {
  const queryClient = useQueryClient();
  const { showErrorToast, showSuccessToast } = useCasesToast();

  return useMutation<Template, ServerError, MutationArgs>(
    ({ template }) => postTemplate({ template }),
    {
      mutationKey: casesMutationsKeys.createTemplate,
      onSuccess: (data) => {
        queryClient.invalidateQueries(casesQueriesKeys.templates);
        if (!disableDefaultSuccessToast) {
          showSuccessToast(i18n.SUCCESS_CREATING_TEMPLATE);
        }
        onSuccess?.(data);
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_CREATING_TEMPLATE });
      },
    }
  );
};
