/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IIndexPattern } from 'src/plugins/data/common';
import { NavTab } from '../../../components/navigation/types';
import { FlowTargetSourceDest } from '../../../graphql/types';
import { networkModel } from '../../../store';
import { ESTermQuery } from '../../../../common/typed_json';
import { GlobalTimeArgs } from '../../../containers/global_time';

import { SetAbsoluteRangeDatePicker } from '../types';
import { UpdateDateRange } from '../../../components/charts/common';
import { NarrowDateRange } from '../../../components/ml/types';

interface QueryTabBodyProps extends Pick<GlobalTimeArgs, 'setQuery' | 'deleteQuery'> {
  skip: boolean;
  type: networkModel.NetworkType;
  startDate: number;
  endDate: number;
  filterQuery?: string | ESTermQuery;
  updateDateRange?: UpdateDateRange;
  narrowDateRange?: NarrowDateRange;
}

export type NetworkComponentQueryProps = QueryTabBodyProps;

export type IPsQueryTabBodyProps = QueryTabBodyProps & {
  indexPattern: IIndexPattern;
  flowTarget: FlowTargetSourceDest;
};

export type TlsQueryTabBodyProps = QueryTabBodyProps & {
  flowTarget: FlowTargetSourceDest;
  ip?: string;
};

export type HttpQueryTabBodyProps = QueryTabBodyProps & {
  ip?: string;
};

export type NetworkRoutesProps = GlobalTimeArgs & {
  networkPagePath: string;
  type: networkModel.NetworkType;
  filterQuery?: string | ESTermQuery;
  indexPattern: IIndexPattern;
  setAbsoluteRangeDatePicker: SetAbsoluteRangeDatePicker;
};

export type KeyNetworkNavTabWithoutMlPermission = NetworkRouteType.dns &
  NetworkRouteType.flows &
  NetworkRouteType.http &
  NetworkRouteType.tls &
  NetworkRouteType.alerts;

type KeyNetworkNavTabWithMlPermission = KeyNetworkNavTabWithoutMlPermission &
  NetworkRouteType.anomalies;

type KeyNetworkNavTab = KeyNetworkNavTabWithoutMlPermission | KeyNetworkNavTabWithMlPermission;

export type NetworkNavTab = Record<KeyNetworkNavTab, NavTab>;

export enum NetworkRouteType {
  flows = 'flows',
  dns = 'dns',
  anomalies = 'anomalies',
  tls = 'tls',
  http = 'http',
  alerts = 'alerts',
}

export type GetNetworkRoutePath = (
  pagePath: string,
  capabilitiesFetched: boolean,
  hasMlUserPermission: boolean
) => string;
