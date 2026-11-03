/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { CASES_OBSERVABLES_DELETED_EVENT_TYPE } from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';
import { useCasesContext } from '../../components/cases_context/use_cases_context';
import { getEbtOwner } from '../get_ebt_owner';

export type ObservableDeleteScope = 'single' | 'bulk';

/**
 * Events Based Tracking for an observable deleted from the case observables tab. A bulk delete
 * reports one event for the confirmed action, not one per removed observable.
 */
export const useObservablesDeletedEBT = () => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  return useCallback(
    ({ deleteScope }: { deleteScope: ObservableDeleteScope }) => {
      analytics.reportEvent(CASES_OBSERVABLES_DELETED_EVENT_TYPE, {
        owner: getEbtOwner(owner),
        delete_scope: deleteScope,
      });
    },
    [analytics, owner]
  );
};
