/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import type { CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { SearchBoostPage } from './components/search_boost_page';

export const renderApp = (core: CoreStart, { element }: ManagementAppMountParams) => {
  const root = createRoot(element);
  root.render(core.rendering.addContext(<SearchBoostPage />));

  return () => {
    root.unmount();
  };
};
