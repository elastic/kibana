/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StaticIndexPattern } from 'ui/index_patterns';

import { NavTab } from '../../../components/navigation/types';
import { FlowTargetSourceDest } from '../../../graphql/types';
import { networkModel } from '../../../store';
import { ESTermQuery } from '../../../../common/typed_json';
import { NarrowDateRange } from '../../../components/ml/types';
import { GlobalTimeArgs } from '../../../containers/global_time';

import { SetAbsoluteRangeDatePicker } from '../types';

interface QueryTabBodyProps {
  type: networkModel.NetworkType;
  filterQuery?: string | ESTermQuery;
}

export type DnsQueryTabBodyProps = QueryTabBodyProps & GlobalTimeArgs;

export type IPsQueryTabBodyProps = QueryTabBodyProps &
  GlobalTimeArgs & {
    indexPattern: StaticIndexPattern;
    flowTarget: FlowTargetSourceDest;
  };

export type TlsQueryTabBodyProps = QueryTabBodyProps &
  GlobalTimeArgs & {
    flowTarget: FlowTargetSourceDest;
    ip?: string;
  };

export type HttpQueryTabBodyProps = QueryTabBodyProps &
  GlobalTimeArgs & {
    ip?: string;
  };
export type AnomaliesQueryTabBodyProps = QueryTabBodyProps &
  Pick<GlobalTimeArgs, 'to' | 'from' | 'isInitializing'> & {
    narrowDateRange: NarrowDateRange;
  };

export type NetworkRoutesProps = GlobalTimeArgs & {
  networkPagePath: string;
  type: networkModel.NetworkType;
  filterQuery?: string | ESTermQuery;
  indexPattern: StaticIndexPattern;
  setAbsoluteRangeDatePicker: SetAbsoluteRangeDatePicker;
};

export type KeyNetworkNavTabWithoutMlPermission = NetworkRouteType.dns &
  NetworkRouteType.flows &
  NetworkRouteType.tls;

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
}

export type GetNetworkRoutePath = (
  pagePath: string,
  capabilitiesFetched: boolean,
  hasMlUserPermission: boolean
) => string;
