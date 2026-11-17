/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { CASES_OBSERVABLES_EXTRACTED_EVENT_TYPE } from '../../../common/constants';
import type { ExtractObservablesStatus } from '../../../common/types/api';
import { useKibana } from '../../common/lib/kibana';
import { useCasesContext } from '../../components/cases_context/use_cases_context';
import { getEbtOwner } from '../get_ebt_owner';

/**
 * Events Based Tracking for observables that a user extracted on demand from the case observables
 * tab. It reports one event for each completed request, whatever the outcome.
 */
export const useObservablesExtractedEBT = () => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  return useCallback(
    ({
      status,
      newObservablesCount,
    }: {
      status: ExtractObservablesStatus;
      newObservablesCount: number;
    }) => {
      analytics.reportEvent(CASES_OBSERVABLES_EXTRACTED_EVENT_TYPE, {
        owner: getEbtOwner(owner),
        status,
        new_observables_count: newObservablesCount,
      });
    },
    [analytics, owner]
  );
};
