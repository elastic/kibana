/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import type { ObservableWithMetadata } from '../../../../common/types/api';
import { useFindObservables } from '../../../containers/use_find_observables';
import { OBSERVABLE_LINK_PARAMS } from './constants';

// Sorted by value, the exact value comes before longer values starting with it.
const LOOKUP_PAGE_SIZE = 10;

const readLinkedObservable = (search: string) => {
  const params = new URLSearchParams(search);
  const typeKey = params.get(OBSERVABLE_LINK_PARAMS.typeKey);
  const value = params.get(OBSERVABLE_LINK_PARAMS.value);
  return typeKey && value ? { typeKey, value } : undefined;
};

/**
 * Opens the flyout of the observable a link points at (the flyout's copy link button), once the
 * case's observables list has found it. The link's parameters are then dropped, so a refresh or
 * remount of the list does not open it again.
 */
export const useOpenLinkedObservable = (
  caseId: string,
  onOpen: (observable: ObservableWithMetadata) => void
): void => {
  const history = useHistory();
  const { search } = useLocation();
  // Read once: the parameters are dropped after the flyout opens.
  const [linked] = useState(() => readLinkedObservable(search));
  const hasOpened = useRef(false);

  const { data } = useFindObservables(
    caseId,
    {
      typeKeys: linked ? [linked.typeKey] : [],
      search: linked?.value,
      sortField: 'value',
      sortOrder: 'asc',
      perPage: LOOKUP_PAGE_SIZE,
    },
    { enabled: linked != null }
  );

  useEffect(() => {
    if (linked == null || hasOpened.current) {
      return;
    }
    const observable = data?.observables.find(
      ({ typeKey, value }) => typeKey === linked.typeKey && value === linked.value
    );
    if (observable == null) {
      return;
    }

    hasOpened.current = true;
    onOpen(observable);

    const params = new URLSearchParams(history.location.search);
    params.delete(OBSERVABLE_LINK_PARAMS.typeKey);
    params.delete(OBSERVABLE_LINK_PARAMS.value);
    history.replace({ ...history.location, search: params.toString() });
  }, [data, history, linked, onOpen]);
};
