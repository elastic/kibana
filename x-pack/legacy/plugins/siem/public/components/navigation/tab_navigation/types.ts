/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UrlInputsModel } from '../../../store/inputs/model';
import { CONSTANTS } from '../../url_state/constants';
import { Timeline } from '../../url_state/types';
import { HostsTableType } from '../../../store/hosts/model';
import { esFilters, Query } from '../../../../../../../../src/plugins/data/public';

import { SiemNavigationProps } from '../types';

export interface TabNavigationProps extends SiemNavigationProps {
  pathName: string;
  pageName: string;
  tabName: HostsTableType | undefined;
  [CONSTANTS.appQuery]?: Query;
  [CONSTANTS.filters]?: esFilters.Filter[];
  [CONSTANTS.savedQuery]?: string;
  [CONSTANTS.timerange]: UrlInputsModel;
  [CONSTANTS.timeline]: Timeline;
}
