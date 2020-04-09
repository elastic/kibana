/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UrlInputsModel } from '../../../store/inputs/model';
import { CONSTANTS } from '../../url_state/constants';
import { HostsTableType } from '../../../store/hosts/model';
import { TimelineUrl } from '../../../store/timeline/model';
import { Filter, Query } from '../../../../../../../../src/plugins/data/public';

import { SiemNavigationProps } from '../types';

export interface TabNavigationProps extends SiemNavigationProps {
  pathName: string;
  pageName: string;
  tabName: HostsTableType | undefined;
  [CONSTANTS.appQuery]?: Query;
  [CONSTANTS.filters]?: Filter[];
  [CONSTANTS.savedQuery]?: string;
  [CONSTANTS.timerange]: UrlInputsModel;
  [CONSTANTS.timeline]: TimelineUrl;
}

export interface TabNavigationItemProps {
  href: string;
  hrefWithSearch: string;
  id: string;
  disabled: boolean;
  name: string;
  isSelected: boolean;
}
