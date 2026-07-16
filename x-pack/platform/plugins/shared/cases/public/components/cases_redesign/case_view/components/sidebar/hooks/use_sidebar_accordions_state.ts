/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { LOCAL_STORAGE_KEYS } from '../../../../../../../common/constants';
import { useCasesLocalStorage } from '../../../../../../common/use_cases_local_storage';

export type SidebarAccordionId = 'attributes' | 'templateFields' | 'connectors';

export type SidebarAccordionsState = Record<SidebarAccordionId, boolean>;

const DEFAULT_ACCORDIONS_STATE: SidebarAccordionsState = {
  attributes: true,
  templateFields: true,
  connectors: true,
};

export const useSidebarAccordionsState = () => {
  const [accordionsState, setAccordionsState] = useCasesLocalStorage<SidebarAccordionsState>(
    LOCAL_STORAGE_KEYS.caseViewSidebarAccordions,
    DEFAULT_ACCORDIONS_STATE
  );

  const isOpen = useCallback(
    (id: SidebarAccordionId) => accordionsState[id] ?? DEFAULT_ACCORDIONS_STATE[id],
    [accordionsState]
  );

  const onToggle = useCallback(
    (id: SidebarAccordionId, nextIsOpen: boolean) => {
      setAccordionsState({
        ...DEFAULT_ACCORDIONS_STATE,
        ...accordionsState,
        [id]: nextIsOpen,
      });
    },
    [accordionsState, setAccordionsState]
  );

  return { isOpen, onToggle };
};
