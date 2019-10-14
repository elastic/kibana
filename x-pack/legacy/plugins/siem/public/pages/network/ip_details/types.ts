/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StaticIndexPattern } from 'ui/index_patterns';
import { ActionCreator } from 'typescript-fsa';

import { NetworkType } from '../../../store/network/model';
import { ESTermQuery } from '../../../../common/typed_json';
import { InspectQuery, Refetch } from '../../../store/inputs/model';
import { FlowTarget } from '../../../graphql/types';
import { InputsModelId } from '../../../store/inputs/constants';
import { GlobalTimeArgs } from '../../../containers/global_time';

export const type = NetworkType.details;

type SetAbsoluteRangeDatePicker = ActionCreator<{
  id: InputsModelId;
  from: number;
  to: number;
}>;

interface IPDetailsComponentReduxProps {
  filterQuery: string;
  flowTarget: FlowTarget;
}

interface IPDetailsComponentDispatchProps {
  setAbsoluteRangeDatePicker: SetAbsoluteRangeDatePicker;
}

export type IPDetailsComponentProps = IPDetailsComponentReduxProps &
  IPDetailsComponentDispatchProps &
  GlobalTimeArgs & { detailName: string };

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

export type DomainsQueryTableProps = OwnProps & {
  indexPattern: StaticIndexPattern;
};
