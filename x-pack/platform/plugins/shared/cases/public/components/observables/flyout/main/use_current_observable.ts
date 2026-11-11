/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ObservableWithMetadata } from '../../../../../common/types/api';
import { useFindObservables } from '../../../../containers/use_find_observables';

// Sorted by value, the exact value comes before longer values starting with it.
const LOOKUP_PAGE_SIZE = 10;

export interface UseCurrentObservable {
  observable: ObservableWithMetadata;
  /** Follows a value edit, which moves the observable out of the current lookup. */
  onValueChanged: (value: string) => void;
}

/**
 * The observable as stored now, with its shared metadata. The panel opens with the table's copy,
 * then reads the observable back from the case's observables list. That list refreshes after any
 * observable edit, so the panel follows edits made from it or from the table.
 */
export const useCurrentObservable = (
  caseId: string,
  initial: ObservableWithMetadata
): UseCurrentObservable => {
  const [value, setValue] = useState(initial.value);
  // Kept while a refetch runs, so the panel does not fall back to the table's copy meanwhile.
  const [lastFound, setLastFound] = useState(initial);

  const { data } = useFindObservables(caseId, {
    typeKeys: [initial.typeKey],
    search: value,
    sortField: 'value',
    sortOrder: 'asc',
    perPage: LOOKUP_PAGE_SIZE,
  });

  const found = data?.observables.find(({ id }) => id === initial.id);

  useEffect(() => {
    if (found != null) {
      setLastFound(found);
    }
  }, [found]);

  const onValueChanged = useCallback((nextValue: string) => setValue(nextValue), []);

  return { observable: found ?? lastFound, onValueChanged };
};
