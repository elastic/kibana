/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { MergeCasesPreviewResponse, MergeFieldsRequest } from '../../common/types/api';
import { useCasesToast } from '../common/use_cases_toast';
import type { ServerError } from '../types';
import { getMergeCasesPreview } from './api';
import { casesQueriesKeys } from './constants';
import * as i18n from './translations';

export const useGetMergeCasesPreview = ({
  caseIds,
  destinationCaseId,
  fields,
}: {
  caseIds: string[];
  destinationCaseId?: string;
  /** The template choice and the field values the template checks. */
  fields?: MergeFieldsRequest;
}) => {
  const { showErrorToast } = useCasesToast();

  return useQuery<MergeCasesPreviewResponse, ServerError>(
    casesQueriesKeys.mergePreview(caseIds, destinationCaseId, fields),
    ({ signal }) =>
      getMergeCasesPreview({
        request: {
          caseIds,
          ...(destinationCaseId != null ? { destinationCaseId } : {}),
          ...(fields != null ? { fields } : {}),
        },
        signal,
      }),
    {
      enabled: caseIds.length > 1,
      keepPreviousData: true,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};
