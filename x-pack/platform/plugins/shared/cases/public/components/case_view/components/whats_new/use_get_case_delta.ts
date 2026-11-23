/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { CaseDeltaResponse } from '../../../../../common/types/api';
import { getCaseDelta, recordCaseView } from '../../../../containers/api';
import { casesQueriesKeys } from '../../../../containers/constants';

/**
 * Recording the view first lets the server start a new session before it reads the window.
 * Every component that calls this hook shares one request through the query key.
 */
const useRecordCaseView = (caseId: string) =>
  useQuery(
    casesQueriesKeys.caseViewRecord(caseId),
    ({ signal }) => recordCaseView(caseId, false, signal),
    {
      staleTime: Infinity,
      retry: false,
    }
  );

export const useGetCaseDelta = (caseId: string) => {
  const { isSuccess: isViewRecorded } = useRecordCaseView(caseId);

  return useQuery<CaseDeltaResponse>(
    casesQueriesKeys.caseDelta(caseId),
    ({ signal }) => getCaseDelta(caseId, signal),
    { enabled: isViewRecorded, staleTime: Infinity }
  );
};
