/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { bulkExportTemplates } from '../api/api';
import { casesMutationsKeys } from '../../../containers/constants';
import * as i18n from '../../templates/translations';
import type { ServerError } from '../../../types';
import { useCasesToast } from '../../../common/use_cases_toast';
import type { BulkExportTemplatesResponse } from '../types';

interface MutationArgs {
  templateIds: string[];
}

export const useBulkExportTemplates = () => {
  const { showErrorToast, showSuccessToast } = useCasesToast();

  return useMutation<BulkExportTemplatesResponse, ServerError, MutationArgs>(
    ({ templateIds }) => bulkExportTemplates({ templateIds }),
    {
      mutationKey: casesMutationsKeys.bulkExportTemplates,
      onSuccess: (_, variables) => {
        showSuccessToast(i18n.SUCCESS_BULK_EXPORTING_TEMPLATES(variables.templateIds.length));
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_BULK_EXPORTING_TEMPLATES });
      },
    }
  );
};
