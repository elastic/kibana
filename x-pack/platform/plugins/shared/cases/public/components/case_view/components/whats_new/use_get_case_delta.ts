/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { CaseDeltaResponse } from '../../../../../common/types/api';
import { getCaseDelta } from '../../../../containers/api';
import { casesQueriesKeys } from '../../../../containers/constants';

export const useGetCaseDelta = (caseId: string, since: string | null) =>
  useQuery<CaseDeltaResponse>(
    casesQueriesKeys.caseDelta(caseId, since ?? ''),
    ({ signal }) => getCaseDelta(caseId, since ?? '', signal),
    { enabled: since != null, staleTime: Infinity }
  );
