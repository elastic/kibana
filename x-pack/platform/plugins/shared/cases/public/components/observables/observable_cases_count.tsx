/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiButtonEmpty, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedNumber } from '@kbn/i18n-react';
import { MAX_CASES_BY_OBSERVABLES_CANDIDATES } from '../../../common/constants';
import { getEmptyCellValue } from '../empty_value';
import * as i18n from './translations';

/**
 * How many other cases hold the observable. Past the most cases the cases tool lists, the count
 * shows as that limit with a `+`: the tool cannot show the rest.
 */
export const ObservableCasesCountValue = ({ count }: { count: number }) =>
  count > MAX_CASES_BY_OBSERVABLES_CANDIDATES ? (
    <>{i18n.CASES_COUNT_ABOVE_MAX(MAX_CASES_BY_OBSERVABLES_CANDIDATES)}</>
  ) : (
    <FormattedNumber value={count} />
  );

ObservableCasesCountValue.displayName = 'ObservableCasesCountValue';

export interface ObservableCasesCountProps {
  /** The count, or nothing when it could not be loaded. */
  count?: number;
  isLoading: boolean;
  /** Opens the cases tool on the observable. */
  onShowCases: () => void;
  'data-test-subj': string;
}

/**
 * How many other cases hold the observable, as the count of the observable flyout's Cases
 * preview: a badge that opens the cases tool.
 */
export const ObservableCasesCount = ({
  count,
  isLoading,
  onShowCases,
  'data-test-subj': dataTestSubj,
}: ObservableCasesCountProps) => {
  if (isLoading) {
    return (
      <EuiLoadingSpinner
        size="s"
        aria-label={i18n.LOADING_RELATED_CASES}
        data-test-subj={`${dataTestSubj}Loading`}
      />
    );
  }

  if (count == null) {
    return getEmptyCellValue();
  }

  return (
    <EuiBadge color="hollow">
      <EuiButtonEmpty
        aria-label={i18n.SHOW_RELATED_CASES}
        onClick={onShowCases}
        disabled={count === 0}
        flush="both"
        size="xs"
        data-test-subj={dataTestSubj}
      >
        <ObservableCasesCountValue count={count} />
      </EuiButtonEmpty>
    </EuiBadge>
  );
};

ObservableCasesCount.displayName = 'ObservableCasesCount';
