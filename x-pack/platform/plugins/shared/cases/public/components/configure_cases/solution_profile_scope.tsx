/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { createContext, useCallback, useContext } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  EuiEmptyPrompt,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSuperSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useCasesContext } from '../cases_context/use_cases_context';
import { CaseOwnerScope } from '../cases_context/case_owner_scope';
import { useAvailableCasesOwners } from '../app/use_available_owners';
import { useGetAvailableOwners } from '../../containers/use_get_available_owners';
import { getOwnerLabel } from '../../common/top_level_app';

const SOLUTION_PARAM = 'solution';

const SOLUTION_LABEL = i18n.translate('xpack.cases.configure.solutionProfile.label', {
  defaultMessage: 'Solution',
});

const NO_SOLUTIONS = i18n.translate('xpack.cases.configure.solutionProfile.noSolutions', {
  defaultMessage: "You don't have access to the settings of any solution.",
});

const SOLUTION_HELP = i18n.translate('xpack.cases.configure.solutionProfile.help', {
  defaultMessage: 'Each solution keeps its own settings. Cases from that solution use them.',
});

/**
 * Settings are kept per solution. In the top-level app, which has no solution of its own, this
 * lets the user pick whose settings to show and scopes the page to that solution. In a solution's
 * own app it renders the page unchanged.
 */
const SolutionProfilePickerContext = createContext<ReactNode>(null);

/** The solution picker, for pages that place it themselves (see `pickerAtTop`). */
export const useSolutionProfilePicker = (): ReactNode => useContext(SolutionProfilePickerContext);

export const SolutionProfileScope: FC<{ children: ReactNode; pickerAtTop?: boolean }> = ({
  children,
  pickerAtTop = true,
}) => {
  const { owner } = useCasesContext();
  const availableOwners = useAvailableCasesOwners(['settings']);
  const { isLoading } = useGetAvailableOwners({ enabled: owner.length === 0 });
  const history = useHistory();
  const { search } = useLocation();
  const requested = new URLSearchParams(search).get(SOLUTION_PARAM);

  const onChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(search);
      params.set(SOLUTION_PARAM, value);
      history.replace({ search: params.toString() });
    },
    [history, search]
  );

  if (owner.length > 0) {
    return <>{children}</>;
  }

  if (availableOwners.length === 0) {
    return isLoading ? (
      <EuiLoadingSpinner size="l" />
    ) : (
      <EuiEmptyPrompt iconType="lock" body={<p>{NO_SOLUTIONS}</p>} />
    );
  }

  const selected =
    requested != null && availableOwners.includes(requested) ? requested : availableOwners[0];

  const picker =
    availableOwners.length > 1 ? (
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
        <EuiFormRow label={SOLUTION_LABEL} helpText={SOLUTION_HELP}>
          <EuiSuperSelect
            data-test-subj="cases-settings-solution-select"
            options={availableOwners.map((value) => ({
              value,
              inputDisplay: getOwnerLabel(value),
            }))}
            valueOfSelected={selected}
            onChange={onChange}
          />
        </EuiFormRow>
      </EuiPanel>
    ) : null;

  return (
    <SolutionProfilePickerContext.Provider value={pickerAtTop ? null : picker}>
      {pickerAtTop && picker}
      <CaseOwnerScope key={selected} caseOwner={selected}>
        {children}
      </CaseOwnerScope>
    </SolutionProfilePickerContext.Provider>
  );
};

SolutionProfileScope.displayName = 'SolutionProfileScope';
