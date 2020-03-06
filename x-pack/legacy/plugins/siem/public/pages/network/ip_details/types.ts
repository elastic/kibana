/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IIndexPattern } from 'src/plugins/data/public';

import { NetworkType } from '../../../store/network/model';
import { ESTermQuery } from '../../../../common/typed_json';
import { InspectQuery, Refetch } from '../../../store/inputs/model';
import { FlowTarget, FlowTargetSourceDest } from '../../../graphql/types';
import { GlobalTimeArgs } from '../../../containers/global_time';

export const type = NetworkType.details;

export type IPDetailsComponentProps = GlobalTimeArgs & {
  detailName: string;
  flowTarget: FlowTarget;
};

export interface OwnProps {
  type: NetworkType;
  startDate: number;
  endDate: number;
  filterQuery: string | ESTermQuery;
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

export type NetworkComponentsQueryProps = OwnProps & {
  flowTarget: FlowTarget;
};

export type TlsQueryTableComponentProps = OwnProps & {
  flowTarget: FlowTargetSourceDest;
};

export type NetworkWithIndexComponentsQueryTableProps = OwnProps & {
  flowTarget: FlowTargetSourceDest;
  indexPattern: IIndexPattern;
};
