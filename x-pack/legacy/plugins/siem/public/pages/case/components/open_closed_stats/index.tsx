/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiDescriptionList, EuiLoadingSpinner } from '@elastic/eui';
import * as i18n from '../all_cases/translations';
import { useGetCases } from '../../../../containers/case/use_get_cases';

export interface Props {
  caseState: 'open' | 'closed';
  closed?: number;
}

export const OpenClosedStats = React.memo<Props>(({ caseState }) => {
  const [{ caseCount, isLoading, loading }, , , , getCaseCount] = useGetCases();

  useEffect(() => {
    getCaseCount(caseState);
  }, [caseState]);

  const openClosedStats = useMemo(() => {
    return [
      {
        title: caseState === 'open' ? i18n.OPEN_CASES : i18n.CLOSED_CASES,
        description:
          isLoading && loading.indexOf('caseCount') > -1 ? (
            <EuiLoadingSpinner />
          ) : (
            caseCount[caseState]
          ),
      },
    ];
  }, [caseCount, caseState, isLoading, loading]);
  return <EuiDescriptionList textStyle="reverse" listItems={openClosedStats} />;
});

OpenClosedStats.displayName = 'OpenClosedStats';
