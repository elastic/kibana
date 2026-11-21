/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type {
  GetObservableMetadataRequest,
  GetObservableMetadataResponse,
} from '../../common/types/api';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { getObservableMetadata } from './api';
import { casesQueriesKeys } from './constants';
import * as i18n from './translations';

/** The shared metadata of a type key and value in the case's space and owner. */
export const useGetObservableMetadata = (
  caseId: string,
  params: GetObservableMetadataRequest,
  { enabled = true }: { enabled?: boolean } = {}
): UseQueryResult<GetObservableMetadataResponse> => {
  const { showErrorToast } = useCasesToast();

  return useQuery(
    casesQueriesKeys.caseObservableMetadata(caseId, params),
    ({ signal }) => getObservableMetadata(caseId, params, signal),
    {
      enabled,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};
