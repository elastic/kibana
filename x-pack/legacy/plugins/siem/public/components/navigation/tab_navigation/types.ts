/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UrlInputsModel } from '../../../store/inputs/model';
import { CONSTANTS } from '../../url_state/constants';
import { KqlQuery, Timeline } from '../../url_state/types';
import { HostsTableType } from '../../../store/hosts/model';

import { SiemNavigationComponentProps } from '../types';

export interface TabNavigationProps extends SiemNavigationComponentProps {
  pathName: string;
  pageName: string;
  tabName: HostsTableType | undefined;
  [CONSTANTS.kqlQuery]: KqlQuery;
  [CONSTANTS.timerange]: UrlInputsModel;
  [CONSTANTS.timeline]: Timeline;
}
