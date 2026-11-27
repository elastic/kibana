/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { buildCollapseSearch } from './side_chat_url';

/**
 * Leaves the Conversation tab for the tab it was opened from (Overview when unknown) and opens
 * the side panel in Chat mode. Both are URL state, so a reload keeps the result.
 */
export const useCollapseToSideChat = (): (() => void) => {
  const history = useHistory();

  return useCallback(() => {
    history.push({
      pathname: history.location.pathname,
      search: buildCollapseSearch(history.location.search),
    });
  }, [history]);
};
