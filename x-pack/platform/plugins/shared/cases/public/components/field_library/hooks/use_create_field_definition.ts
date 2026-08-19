/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type {
  CreateFieldDefinitionInput,
  FieldDefinition,
} from '../../../../common/types/domain/field_definition/v1';
import { postFieldDefinition } from '../api/api';
import { casesQueriesKeys, casesMutationsKeys } from '../../../containers/constants';
import * as i18n from '../translations';
import type { ServerError } from '../../../types';
import { useCasesToast } from '../../../common/use_cases_toast';

interface MutationArgs {
  fieldDefinition: CreateFieldDefinitionInput;
}

interface UseCreateFieldDefinitionProps {
  onSuccess?: (data: FieldDefinition) => void;
}

export const useCreateFieldDefinition = ({ onSuccess }: UseCreateFieldDefinitionProps = {}) => {
  const queryClient = useQueryClient();
  const { showErrorToast, showSuccessToast } = useCasesToast();

  return useMutation<FieldDefinition, ServerError, MutationArgs>(
    ({ fieldDefinition }) => postFieldDefinition({ fieldDefinition }),
    {
      mutationKey: casesMutationsKeys.createFieldDefinition,
      onSuccess: (data) => {
        queryClient.invalidateQueries(casesQueriesKeys.fieldDefinitions);
        showSuccessToast(i18n.SUCCESS_CREATING_FIELD_DEFINITION);
        onSuccess?.(data);
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_CREATING_FIELD_DEFINITION });
      },
    }
  );
};
