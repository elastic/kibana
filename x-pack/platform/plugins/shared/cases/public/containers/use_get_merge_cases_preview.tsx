/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { useQuery } from '@kbn/react-query';
import type { MergeCasesPreviewResponse, MergeFieldsRequest } from '../../common/types/api';
import { useCasesToast } from '../common/use_cases_toast';
import type { ServerError } from '../types';
import { getMergeCasesPreview } from './api';
import { casesQueriesKeys } from './constants';
import * as i18n from './translations';

/** Typing a value only refetches the preview once the user pauses. */
export const MERGE_PREVIEW_DEBOUNCE_MS = 300;

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
  const [debouncedFields, setDebouncedFields] = useState(fields);
  useDebounce(() => setDebouncedFields(fields), MERGE_PREVIEW_DEBOUNCE_MS, [fields]);

  return useQuery<MergeCasesPreviewResponse, ServerError>(
    casesQueriesKeys.mergePreview(caseIds, destinationCaseId, debouncedFields),
    ({ signal }) =>
      getMergeCasesPreview({
        request: {
          caseIds,
          ...(destinationCaseId != null ? { destinationCaseId } : {}),
          ...(debouncedFields != null ? { fields: debouncedFields } : {}),
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
