/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getAllCasesSelectorModalNoProviderLazy } from '../../client/ui/get_all_cases_selector_modal';
import { getCreateCaseFlyoutLazyNoProvider } from '../../client/ui/get_create_case_flyout';
import type { CasesContextState } from './state/cases_context_reducer';
import { getRemoveAlertFromCaseModal } from '../../client/ui/get_remove_alert_modal';

export const CasesGlobalComponents = React.memo(({ state }: { state: CasesContextState }) => {
  return (
    <>
      {state.createCaseFlyout.isFlyoutOpen && state.createCaseFlyout.props !== undefined
        ? getCreateCaseFlyoutLazyNoProvider(state.createCaseFlyout.props)
        : null}
      {state.selectCaseModal.isModalOpen && state.selectCaseModal.props !== undefined
        ? getAllCasesSelectorModalNoProviderLazy(state.selectCaseModal.props)
        : null}
      {state.removeAlertModal.isModalOpen && state.removeAlertModal.props !== undefined
        ? getRemoveAlertFromCaseModal(state.removeAlertModal.props)
        : null}
    </>
  );
});
CasesGlobalComponents.displayName = 'CasesContextUi';
