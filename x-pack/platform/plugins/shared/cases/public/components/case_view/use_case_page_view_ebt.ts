/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect } from 'react';

import { CASE_PAGE_VIEW_EVENT_TYPE } from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';
import { useCasesContext } from '../cases_context/use_cases_context';
import { isRegisteredOwner } from '../../files';

export const useCasePageViewEbt = () => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  useEffect(() => {
    analytics.reportEvent(CASE_PAGE_VIEW_EVENT_TYPE, {
      owner: owner[0] && isRegisteredOwner(owner[0]) ? owner[0] : 'unknown',
    });
  }, [analytics, owner]);
};
