/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContextEngineSearchNavigationAdapter } from '../../search_navigation_adapter';

export const createSearchNavigationMock = (): ContextEngineSearchNavigationAdapter => ({
  handleOnAppMount: jest.fn().mockResolvedValue(undefined),
  useClassicNavigation: jest.fn(),
  breadcrumbs: {
    setSearchBreadCrumbs: jest.fn(),
    clearBreadcrumbs: jest.fn(),
  },
});
