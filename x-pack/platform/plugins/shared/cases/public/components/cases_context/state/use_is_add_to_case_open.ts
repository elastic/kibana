/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCasesStateContext } from './cases_state_context';

export type UseIsAddToCaseOpen = () => boolean;

/**
 * This hook is to check if the "add to case" is open, either the modal or the flyout
 */
export const useIsAddToCaseOpen: UseIsAddToCaseOpen = () => {
  const { selectCaseModal, createCaseFlyout } = useCasesStateContext();
  return selectCaseModal.isModalOpen || createCaseFlyout.isFlyoutOpen;
};
