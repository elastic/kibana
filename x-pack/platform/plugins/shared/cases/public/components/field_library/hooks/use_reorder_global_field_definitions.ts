/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { FieldDefinition } from '../../../../common/types/domain/field_definition/v1';
import { putFieldDefinition } from '../api/api';
import { casesMutationsKeys, casesQueriesKeys } from '../../../containers/constants';
import type { ServerError } from '../../../types';
import { useCasesToast } from '../../../common/use_cases_toast';
import * as i18n from '../translations';

export const useReorderGlobalFieldDefinitions = () => {
  const queryClient = useQueryClient();
  const { showErrorToast } = useCasesToast();

  return useMutation<FieldDefinition[], ServerError, FieldDefinition[]>(
    (fieldDefinitions) =>
      Promise.all(
        fieldDefinitions.map(({ fieldDefinitionId, ...fieldDefinition }) =>
          putFieldDefinition({ id: fieldDefinitionId, fieldDefinition })
        )
      ),
    {
      mutationKey: casesMutationsKeys.updateFieldDefinition,
      // No success toast: the list settling into its new order is the feedback, and a toast per
      // drag would fire several times during a single reordering session.
      onSuccess: () => {
        queryClient.invalidateQueries(casesQueriesKeys.fieldDefinitions);
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_REORDERING_GLOBAL_FIELD_DEFINITIONS });
      },
    }
  );
};
