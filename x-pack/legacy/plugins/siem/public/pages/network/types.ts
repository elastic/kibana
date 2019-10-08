/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StaticIndexPattern } from 'ui/index_patterns';
import { RouteComponentProps } from 'react-router-dom';
import { ActionCreator } from 'typescript-fsa';

import { FlowTarget } from '../../graphql/types';
import { NavTab } from '../../components/navigation/types';
import { GlobalTimeArgs } from '../../containers/global_time';
import { NetworkTableType } from '../../store/network/model';
import { networkModel } from '../../store';
import { ESTermQuery } from '../../../common/typed_json';
import { InputsModelId } from '../../store/inputs/constants';

export type KeyNetworkNavTabWithoutMlPermission = NetworkTableType.dns &
  NetworkTableType.topNFlowSource &
  NetworkTableType.topNFlowDestination;

type KeyNetworkNavTabWithMlPermission = KeyNetworkNavTabWithoutMlPermission &
  NetworkTableType.anomalies;

type KeyNetworkNavTab = KeyNetworkNavTabWithoutMlPermission | KeyNetworkNavTabWithMlPermission;

export type NetworkNavTab = Record<KeyNetworkNavTab, NavTab>;

export type NetworkTabsProps = GlobalTimeArgs & {
  networkPagePath: string;
  type: networkModel.NetworkType;
  filterQuery?: string | ESTermQuery;
  indexPattern: StaticIndexPattern;
  setAbsoluteRangeDatePicker: SetAbsoluteRangeDatePicker;
};

type SetAbsoluteRangeDatePicker = ActionCreator<{
  id: InputsModelId;
  from: number;
  to: number;
}>;

interface NetworkComponentReduxProps {
  filterQuery: string;
  queryExpression: string;
  setAbsoluteRangeDatePicker: SetAbsoluteRangeDatePicker;
}

export type NetworkComponentProps = NetworkComponentReduxProps &
  GlobalTimeArgs &
  Partial<RouteComponentProps<{}>> & { networkPagePath: string };

export enum NetworkTabType {
  dns = 'dns',
  ips = 'ips',
  anomalies = 'anomalies',
}

interface IPDetailsComponentReduxProps {
  filterQuery: string;
  flowTarget: FlowTarget;
  setAbsoluteRangeDatePicker: SetAbsoluteRangeDatePicker;
}

export type IPDetailsComponentProps = IPDetailsComponentReduxProps &
  GlobalTimeArgs & { detailName: string };
