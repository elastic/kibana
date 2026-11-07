/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { INTERNAL_PRIOR_OUTCOMES_URL } from '../../common/constants';
import type { PriorOutcomesResponse } from '../../common/knowledge/types';
import { KibanaServices } from '../common/lib/kibana';
import { casesQueriesKeys } from './constants';

/**
 * Outcomes of similar closed cases. Never toasts: Prior outcomes is a hint, and the line hides
 * itself when this fails.
 */
export const useGetPriorOutcomes = (caseId: string, { enabled }: { enabled: boolean }) =>
  useQuery<PriorOutcomesResponse>(
    [...casesQueriesKeys.case(caseId), 'priorOutcomes'],
    ({ signal }) =>
      KibanaServices.get().http.fetch<PriorOutcomesResponse>(
        INTERNAL_PRIOR_OUTCOMES_URL.replace('{case_id}', encodeURIComponent(caseId)),
        { method: 'GET', signal }
      ),
    { enabled, retry: false, staleTime: 60_000 }
  );
