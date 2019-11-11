/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StaticIndexPattern } from 'ui/index_patterns';
import { ActionCreator } from 'typescript-fsa';
import { Query, esFilters } from 'src/plugins/data/public';

import { SiemPageName } from '../home/types';
import { hostsModel } from '../../store';
import { InputsModelId } from '../../store/inputs/constants';
import { GlobalTimeArgs } from '../../containers/global_time';

export const hostsPagePath = `/:pageName(${SiemPageName.hosts})`;
export const hostDetailsPagePath = `${hostsPagePath}/:detailName`;

export interface HostsComponentReduxProps {
  query: Query;
  filters: esFilters.Filter[];
}

export interface HostsComponentDispatchProps {
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>;
  hostsPagePath: string;
}

export type HostsTabsProps = HostsComponentDispatchProps &
  HostsQueryProps & {
    filterQuery: string;
    type: hostsModel.HostsType;
    indexPattern: StaticIndexPattern;
  };

export type HostsQueryProps = GlobalTimeArgs;

export type HostsComponentProps = HostsComponentReduxProps &
  HostsComponentDispatchProps &
  HostsQueryProps;
