/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCasesContext } from '../cases_context/use_cases_context';
import { useAvailableCasesOwners } from './use_available_owners';
import { useActiveSolution } from './use_active_solution';
import { getOwnerDefaultValue } from '../create/utils';

export function useOwnerSelector() {
  const { owner, isServerless } = useCasesContext();
  console.log(isServerless, '!!isServerless');
  const activeSolution = useActiveSolution();
  const availableOwners = useAvailableCasesOwners();

  let defaultOwnerValue = owner[0] ?? getOwnerDefaultValue(availableOwners);

  const mapActiveSolutionToOwner = (solution: string): string => {
    switch (solution) {
      case 'oblt':
        return 'observability';
      case 'security':
        return 'securitySolution';
      case 'classic':
        return 'cases';
      default:
        return defaultOwnerValue;
    }
  };

  if (activeSolution !== undefined) {
    defaultOwnerValue = mapActiveSolutionToOwner(activeSolution);
  }

  let shouldShowOwnerSelector = false;
  if (isServerless) {
    shouldShowOwnerSelector = availableOwners.length > 1;
  } else {
    if (activeSolution === 'classic') {
      shouldShowOwnerSelector = availableOwners.length > 1;
    }
  }

  return {
    defaultOwnerValue,
    shouldShowOwnerSelector,
  };
}
