/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';

import type { CaseAccessMode } from '../../common/types/domain';
import { CASE_ACCESS_CONTROL_CLICKED_EVENT_TYPE } from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { getEbtOwner } from './get_ebt_owner';

/**
 * Events Based Tracking for the restricted-cases access control, in the create
 * flow and the case view.
 */
export const useAccessControlClickedEBT = (location: 'create' | 'case_view') => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  return useCallback(
    (mode: CaseAccessMode) => {
      analytics.reportEvent(CASE_ACCESS_CONTROL_CLICKED_EVENT_TYPE, {
        owner: getEbtOwner(owner),
        mode,
        location,
      });
    },
    [analytics, owner, location]
  );
};
