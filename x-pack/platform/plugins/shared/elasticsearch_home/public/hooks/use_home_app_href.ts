/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';

/**
 * Builds the URL of a path under the hosting app's root. Core routes clicks on an `href` to it within
 * the app, without a page reload, so links need no `onClick`. Requires the host's scoped history in
 * the surrounding `Router`.
 */
export const useHomeAppHref = (): ((path: string) => string) => {
  const history = useHistory();

  return useCallback((path: string) => history.createHref({ pathname: path }), [history]);
};
