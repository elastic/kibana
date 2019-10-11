/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UrlStateType } from '../url_state/constants';

export interface SiemNavigationComponentProps {
  display?: 'default' | 'condensed';
  navTabs: Record<string, NavTab>;
  showBorder?: boolean;
}

export type SearchNavTab = NavTab | { urlKey: UrlStateType; isDetailPage: boolean };

export interface NavTab {
  id: string;
  name: string;
  href: string;
  disabled: boolean;
  urlKey: UrlStateType;
  isDetailPage?: boolean;
}
