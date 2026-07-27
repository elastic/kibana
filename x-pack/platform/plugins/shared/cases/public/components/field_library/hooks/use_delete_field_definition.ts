/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { deleteFieldDefinition } from '../api/api';
import { casesQueriesKeys, casesMutationsKeys } from '../../../containers/constants';
import * as i18n from '../translations';
import type { ServerError } from '../../../types';
import { useCasesToast } from '../../../common/use_cases_toast';

interface MutationArgs {
  id: string;
}

interface UseDeleteFieldDefinitionProps {
  onSuccess?: () => void;
}

export const useDeleteFieldDefinition = ({ onSuccess }: UseDeleteFieldDefinitionProps = {}) => {
  const queryClient = useQueryClient();
  const { showErrorToast, showSuccessToast } = useCasesToast();

  return useMutation<void, ServerError, MutationArgs>(({ id }) => deleteFieldDefinition({ id }), {
    mutationKey: casesMutationsKeys.deleteFieldDefinition,
    onSuccess: () => {
      queryClient.invalidateQueries(casesQueriesKeys.fieldDefinitions);
      showSuccessToast(i18n.SUCCESS_DELETING_FIELD_DEFINITION);
      onSuccess?.();
    },
    onError: (error: ServerError) => {
      showErrorToast(error, { title: i18n.ERROR_DELETING_FIELD_DEFINITION });
    },
  });
};
