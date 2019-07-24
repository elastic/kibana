/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactNode } from 'react';
import { SearchScope } from '../../model';

export enum PathTypes {
  blob = 'blob',
  tree = 'tree',
  blame = 'blame',
  commits = 'commits',
}

export const SearchScopeText = {
  [SearchScope.DEFAULT]: 'Search Everything',
  [SearchScope.REPOSITORY]: 'Search Repositories',
  [SearchScope.SYMBOL]: 'Search Symbols',
  [SearchScope.FILE]: 'Search Files',
};

export const SearchScopePlaceholderText = {
  [SearchScope.DEFAULT]: 'Type to find anything',
  [SearchScope.REPOSITORY]: 'Type to find repositories',
  [SearchScope.SYMBOL]: 'Type to find symbols',
  [SearchScope.FILE]: 'Type to find files',
};

export interface MainRouteParams {
  path: string;
  repo: string;
  resource: string;
  org: string;
  revision: string;
  pathType: PathTypes;
  goto?: string;
}

export interface EuiSideNavItem {
  id: string;
  name: string;
  isSelected?: boolean;
  renderItem?: () => ReactNode;
  forceOpen?: boolean;
  items?: EuiSideNavItem[];
  onClick: () => void;
}
