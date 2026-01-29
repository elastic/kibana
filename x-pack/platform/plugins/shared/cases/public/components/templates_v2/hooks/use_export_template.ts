/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { exportTemplate } from '../api/api';
import { casesMutationsKeys } from '../../../containers/constants';
import * as i18n from '../../templates/translations';
import type { ServerError } from '../../../types';
import { useCasesToast } from '../../../common/use_cases_toast';
import type { ExportTemplateResponse } from '../types';

interface MutationArgs {
  templateId: string;
}

export const useExportTemplate = () => {
  const { showErrorToast, showSuccessToast } = useCasesToast();

  return useMutation<ExportTemplateResponse, ServerError, MutationArgs>(
    ({ templateId }) => exportTemplate({ templateId }),
    {
      mutationKey: casesMutationsKeys.exportTemplate,
      onSuccess: () => {
        showSuccessToast(i18n.SUCCESS_EXPORTING_TEMPLATE);
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_EXPORTING_TEMPLATE });
      },
    }
  );
};
