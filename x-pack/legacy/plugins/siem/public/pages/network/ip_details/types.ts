/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionCreator } from 'typescript-fsa';

import { IpDetailsTableType, NetworkType } from '../../../store/network/model';
import { ESTermQuery } from '../../../../common/typed_json';
import { NarrowDateRange } from '../../../components/ml/types';
import { InspectQuery, Refetch } from '../../../store/inputs/model';
import { FlowTarget } from '../../../graphql/types';
import { InputsModelId } from '../../../store/inputs/constants';
import { GlobalTimeArgs } from '../../../containers/global_time';

export const type = NetworkType.details;
interface IPDetailsComponentReduxProps {
  filterQuery: string;
  flowTarget: FlowTarget;
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>;
}

interface IPDetailsComponentDispatchProps {
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>;
  detailName: string;
}

export type IPDetailsComponentProps = IPDetailsComponentReduxProps & { detailName: string };

export type IPDetailsBodyComponentProps = IPDetailsComponentReduxProps &
  IPDetailsComponentDispatchProps &
  IPDetailsBodyProps;

type KeIPDetailsNavTabWithoutMlPermission = IpDetailsTableType.tls & IpDetailsTableType.users;

type KeIPDetailsNavTabWithMlPermission = KeIPDetailsNavTabWithoutMlPermission &
  IpDetailsTableType.anomalies;

export type KeyIPDetailsNavTab =
  | KeIPDetailsNavTabWithoutMlPermission
  | KeIPDetailsNavTabWithMlPermission;

interface OwnProps {
  type: NetworkType;
  startDate: number;
  endDate: number;
  filterQuery: string | ESTermQuery;
  flowTarget: FlowTarget;
  ip: string;
  skip: boolean;
  setQuery: ({
    id,
    inspect,
    loading,
    refetch,
  }: {
    id: string;
    inspect: InspectQuery | null;
    loading: boolean;
    refetch: Refetch;
  }) => void;
}

export type NetworkComponentsQueryProps = OwnProps;

export type AnomaliesQueryTabBodyProps = OwnProps & {
  narrowDateRange: NarrowDateRange;
};

export type NetworkQueryProps = GlobalTimeArgs;

export interface IPDetailsBodyProps extends NetworkQueryProps {
  children: CommonChildren | AnonamaliesChildren;
}

export type CommonChildren = (args: NetworkComponentsQueryProps) => JSX.Element;
export type AnonamaliesChildren = (args: AnomaliesQueryTabBodyProps) => JSX.Element;
