/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ReactNode } from 'react';
import { SearchScope } from '../../model';

export enum PathTypes {
  blob = 'blob',
  tree = 'tree',
  blame = 'blame',
  commits = 'commits',
}

export const SearchScopeText = {
  [SearchScope.DEFAULT]: i18n.translate('xpack.code.searchScope.defaultDropDownOptionLabel', {
    defaultMessage: 'Search Everything',
  }),
  [SearchScope.REPOSITORY]: i18n.translate('xpack.code.searchScope.repositoryDropDownOptionLabel', {
    defaultMessage: 'Search Repositories',
  }),
  [SearchScope.SYMBOL]: i18n.translate('xpack.code.searchScope.symbolDropDownOptionLabel', {
    defaultMessage: 'Search Symbols',
  }),
  [SearchScope.FILE]: i18n.translate('xpack.code.searchScope.fileDropDownOptionLabel', {
    defaultMessage: 'Search Files',
  }),
};

export const SearchScopePlaceholderText = {
  [SearchScope.DEFAULT]: i18n.translate('xpack.code.searchScope.defaultPlaceholder', {
    defaultMessage: 'Type to find anything',
  }),
  [SearchScope.REPOSITORY]: i18n.translate('xpack.code.searchScope.repositoryPlaceholder', {
    defaultMessage: 'Type to find repositories',
  }),
  [SearchScope.SYMBOL]: i18n.translate('xpack.code.searchScope.symbolPlaceholder', {
    defaultMessage: 'Type to find symbols',
  }),
  [SearchScope.FILE]: i18n.translate('xpack.code.searchScope.filePlaceholder', {
    defaultMessage: 'Type to find files',
  }),
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
