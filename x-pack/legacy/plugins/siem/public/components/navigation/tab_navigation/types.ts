/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UrlInputsModel } from '../../../store/inputs/model';
import { CONSTANTS } from '../../url_state/constants';
import { KqlQuery } from '../../url_state/types';
import { HostsTableType } from '../../../store/hosts/model';

import { SiemNavigationComponentProps } from '../types';

export interface TabNavigationProps extends SiemNavigationComponentProps {
  pathName: string;
  pageName: string;
  tabName: HostsTableType | undefined;
  hosts: KqlQuery;
  hostDetails: KqlQuery;
  network: KqlQuery;
  [CONSTANTS.timerange]: UrlInputsModel;
  [CONSTANTS.timelineId]: string;
}
