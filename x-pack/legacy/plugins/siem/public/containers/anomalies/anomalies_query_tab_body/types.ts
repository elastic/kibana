/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { hostsModel, networkModel } from '../../../store';
import { ESTermQuery } from '../../../../common/typed_json';
import { NarrowDateRange, AnomaliesNetworkTableProps } from '../../../components/ml/types';
import { UpdateDateRange } from '../../../components/charts/common';
import { SetQuery } from '../../../pages/hosts/navigation/types';

interface QueryTabBodyProps {
  type: hostsModel.HostsType | networkModel.NetworkType;
  filterQuery?: string | ESTermQuery;
}

export type AnomaliesTableComponent = Omit<AnomaliesNetworkTableProps, 'type'> & {
  type: hostsModel.HostsType | networkModel.NetworkType;
};

export type AnomaliesQueryTabBodyProps = QueryTabBodyProps & {
  startDate: number;
  endDate: number;
  skip: boolean;
  setQuery: SetQuery;
  narrowDateRange: NarrowDateRange;
  updateDateRange?: UpdateDateRange;
  anomaliesFilterQuery?: object;
  // @ts-ignore
  AnomaliesTableComponent: any; // eslint-disable-line
};
