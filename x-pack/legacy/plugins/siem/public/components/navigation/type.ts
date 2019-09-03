/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Location } from 'history';

import { UrlInputsModel } from '../../store/inputs/model';
import { CONSTANTS } from '../url_state/constants';
import { KqlQuery, UrlStateType } from '../url_state/types';
import { NavigationParams } from './breadcrumbs';

export interface NavTab {
  id: string;
  name: string;
  href: string;
  disabled: boolean;
  urlKey: UrlStateType;
  isDetailPage?: boolean;
}

export interface NavMatchParams {
  params: NavigationParams;
}

export interface SiemNavigationComponentProps {
  display?: 'default' | 'condensed';
  navTabs: Record<string, NavTab>;
  showBorder?: boolean;
}

export interface TabNavigationProps extends SiemNavigationComponentProps {
  location: Location;
  hosts: KqlQuery;
  hostDetails: KqlQuery;
  network: KqlQuery;
  [CONSTANTS.timerange]: UrlInputsModel;
  [CONSTANTS.timelineId]: string;
  match?: NavMatchParams;
}
