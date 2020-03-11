/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Dispatch, useEffect, useMemo } from 'react';
import { EuiDescriptionList, EuiLoadingSpinner } from '@elastic/eui';
import * as i18n from '../all_cases/translations';
import { CaseCount } from '../../../../containers/case/use_get_cases';

export interface Props {
  caseCount: CaseCount;
  caseStatus: 'open' | 'closed';
  getCaseCount: Dispatch<keyof CaseCount>;
  isLoading: boolean;
}

export const OpenClosedStats = React.memo<Props>(
  ({ caseCount, caseStatus, getCaseCount, isLoading }) => {
    useEffect(() => {
      getCaseCount(caseStatus);
    }, [caseStatus]);

    const openClosedStats = useMemo(
      () => [
        {
          title: caseStatus === 'open' ? i18n.OPEN_CASES : i18n.CLOSED_CASES,
          description: isLoading ? <EuiLoadingSpinner /> : caseCount[caseStatus],
        },
      ],
      [caseCount, caseStatus, isLoading]
    );
    return <EuiDescriptionList textStyle="reverse" listItems={openClosedStats} />;
  }
);

OpenClosedStats.displayName = 'OpenClosedStats';
