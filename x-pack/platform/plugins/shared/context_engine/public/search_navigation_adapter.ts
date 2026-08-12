/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import type { ScopedHistory } from '@kbn/core/public';
import type { SolutionNavProps } from '@kbn/shared-ux-page-solution-nav';

export interface ContextEngineSearchNavigationAdapter {
  handleOnAppMount: () => Promise<void>;
  useClassicNavigation: (history: ScopedHistory) => SolutionNavProps | undefined;
  breadcrumbs: {
    setSearchBreadCrumbs: (breadcrumbs: ChromeBreadcrumb[]) => void;
    clearBreadcrumbs: () => void;
  };
}
