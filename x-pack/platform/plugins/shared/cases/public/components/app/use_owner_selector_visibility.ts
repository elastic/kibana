/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect } from 'react';
import { SOLUTION_VIEW_CLASSIC } from '@kbn/spaces-plugin/common';
import {
  KIBANA_OBSERVABILITY_PROJECT,
  KIBANA_SECURITY_PROJECT,
  KIBANA_OBSERVABILITY_SOLUTION,
} from '@kbn/projects-solutions-groups';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useAvailableCasesOwners } from './use_available_owners';
import { useActiveSolution } from './use_active_solution';
import { getOwnerDefaultValue } from '../create/utils';
import { APP_ID } from '../../../common/constants';

export function useOwnerSelectorVisibility() {
  const { owner, isServerless } = useCasesContext();
  const activeSolution = useActiveSolution();
  const availableOwners = useAvailableCasesOwners();

  const [defaultOwnerValue, setDefaultOwnerValue] = useState<string>(
    owner[0] ?? getOwnerDefaultValue(availableOwners)
  );
  const [shouldShowOwnerSelector, setShouldShowOwnerSelector] = useState<boolean>(false);

  useEffect(() => {
    let computedDefaultOwner = owner[0] ?? getOwnerDefaultValue(availableOwners);

    const mapActiveSolutionToOwner = (solution: string): string => {
      switch (solution) {
        case KIBANA_OBSERVABILITY_PROJECT:
          return KIBANA_OBSERVABILITY_SOLUTION;
        case KIBANA_SECURITY_PROJECT:
          return 'securitySolution';
        case SOLUTION_VIEW_CLASSIC:
          return APP_ID;
        default:
          return computedDefaultOwner;
      }
    };

    if (activeSolution !== undefined) {
      computedDefaultOwner = mapActiveSolutionToOwner(activeSolution);
    }

    let computedShouldShow = false;
    if (isServerless) {
      computedShouldShow = availableOwners.length > 1;
    } else {
      if (activeSolution === SOLUTION_VIEW_CLASSIC) {
        computedShouldShow = availableOwners.length > 1;
      }
    }
    setDefaultOwnerValue(computedDefaultOwner);
    setShouldShowOwnerSelector(computedShouldShow);
  }, [owner, isServerless, activeSolution, availableOwners]);

  return {
    defaultOwnerValue,
    shouldShowOwnerSelector,
  };
}
