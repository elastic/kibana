/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { deleteTemplate } from '../api/api';
import { casesQueriesKeys, casesMutationsKeys } from '../../../containers/constants';
import * as i18n from '../../templates/translations';
import type { ServerError } from '../../../types';
import { useCasesToast } from '../../../common/use_cases_toast';
import type { DeleteTemplateResponse } from '../types';

interface MutationArgs {
  templateId: string;
}

interface UseDeleteTemplateProps {
  onSuccess?: () => void;
}

export const useDeleteTemplate = ({ onSuccess }: UseDeleteTemplateProps = {}) => {
  const queryClient = useQueryClient();
  const { showErrorToast, showSuccessToast } = useCasesToast();

  return useMutation<DeleteTemplateResponse, ServerError, MutationArgs>(
    ({ templateId }) => deleteTemplate({ templateId }),
    {
      mutationKey: casesMutationsKeys.deleteTemplate,
      onSuccess: () => {
        queryClient.invalidateQueries(casesQueriesKeys.templatesList());
        showSuccessToast(i18n.SUCCESS_DELETING_TEMPLATE);
        onSuccess?.();
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_DELETING_TEMPLATE });
      },
    }
  );
};
