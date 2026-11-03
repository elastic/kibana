/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import type { Location } from 'history';
import { searchParamNames } from '../search_param_names';

const hasCollapsedHint = (search: string): boolean =>
  new URLSearchParams(search).get(searchParamNames.sidebarCollapsed) === 'true';

/**
 * Keeps the sidebar collapsed state. A `sidebarCollapsed=true` URL param collapses it once,
 * then the param is removed from the URL.
 */
export const useSidebarCollapsed = (): [boolean, React.Dispatch<React.SetStateAction<boolean>>] => {
  const history = useHistory();
  const [isCondensed, setIsCondensed] = useState(() => hasCollapsedHint(history.location.search));

  useEffect(() => {
    // `consumeHint` reads the URL param, collapses the sidebar, and removes the param.
    // It runs once on mount, and again on each in-app URL change (the layout stays mounted).
    const consumeHint = ({ pathname, search, hash, state }: Location) => {
      const searchParams = new URLSearchParams(search);
      if (!searchParams.has(searchParamNames.sidebarCollapsed)) {
        return;
      }
      if (hasCollapsedHint(search)) {
        setIsCondensed(true);
      }
      searchParams.delete(searchParamNames.sidebarCollapsed);
      history.replace({ pathname, search: searchParams.toString(), hash, state });
    };

    consumeHint(history.location);
    return history.listen(consumeHint);
  }, [history]);

  return [isCondensed, setIsCondensed];
};
