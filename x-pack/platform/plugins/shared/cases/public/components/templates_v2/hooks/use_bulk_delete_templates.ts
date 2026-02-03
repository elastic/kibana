/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { bulkDeleteTemplates } from '../api/api';
import { casesQueriesKeys, casesMutationsKeys } from '../../../containers/constants';
import * as i18n from '../../templates/translations';
import type { ServerError } from '../../../types';
import { useCasesToast } from '../../../common/use_cases_toast';
import type { BulkDeleteTemplatesResponse } from '../types';

interface MutationArgs {
  templateIds: string[];
}

interface UseBulkDeleteTemplatesProps {
  onSuccess?: () => void;
}

export const useBulkDeleteTemplates = ({ onSuccess }: UseBulkDeleteTemplatesProps = {}) => {
  const queryClient = useQueryClient();
  const { showErrorToast, showSuccessToast } = useCasesToast();

  return useMutation<BulkDeleteTemplatesResponse, ServerError, MutationArgs>(
    ({ templateIds }) => bulkDeleteTemplates({ templateIds }),
    {
      mutationKey: casesMutationsKeys.bulkDeleteTemplates,
      onSuccess: (data) => {
        queryClient.invalidateQueries(casesQueriesKeys.templatesList());
        showSuccessToast(i18n.SUCCESS_BULK_DELETING_TEMPLATES(data.deleted.length));
        onSuccess?.();
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_BULK_DELETING_TEMPLATES });
      },
    }
  );
};
