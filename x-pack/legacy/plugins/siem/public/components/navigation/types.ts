/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { esFilters, Query } from '../../../../../../../src/plugins/data/public';
import { HostsTableType } from '../../store/hosts/model';
import { UrlInputsModel } from '../../store/inputs/model';
import { CONSTANTS, UrlStateType } from '../url_state/constants';
import { Timeline } from '../url_state/types';

export interface SiemNavigationProps {
  display?: 'default' | 'condensed';
  navTabs: Record<string, NavTab>;
}

export interface SiemNavigationComponentProps {
  pathName: string;
  pageName: string;
  tabName: HostsTableType | undefined;
  urlState: {
    [CONSTANTS.appQuery]?: Query;
    [CONSTANTS.filters]?: esFilters.Filter[];
    [CONSTANTS.savedQuery]?: string;
    [CONSTANTS.timerange]: UrlInputsModel;
    [CONSTANTS.timeline]: Timeline;
  };
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
