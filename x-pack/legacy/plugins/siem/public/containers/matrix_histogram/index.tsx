/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { inputsModel, hostsModel, networkModel } from '../../store';
import { QueryTemplateProps } from '../query_template';

import { MatrixOverTimeHistogramData, Maybe } from '../../graphql/types';
import { MatrixHistogramOption, MatrixHistogramMappingTypes } from './types';
import { UpdateDateRange } from '../../components/charts/common';
import { SetQuery } from '../../pages/hosts/navigation/types';
import { MatrixHistogram } from './matrix_histogram';

export interface EventsArgs {
  endDate: number;
  eventsOverTime: MatrixOverTimeHistogramData[];
  id: string;
  inspect: inputsModel.InspectQuery;
  loading: boolean;
  refetch: inputsModel.Refetch;
  startDate: number;
  totalCount: number;
}

export interface OwnProps extends QueryTemplateProps {
  dataKey: string | string[];
  defaultStackByOption: MatrixHistogramOption;
  deleteQuery?: ({ id }: { id: string }) => void;
  hideHistogramIfEmpty?: boolean;
  id: string;
  mapping?: MatrixHistogramMappingTypes;
  query: Maybe<string>;
  setQuery: SetQuery;
  sourceId: string;
  stackByOptions: MatrixHistogramOption[];
  subtitle?: string;
  type: hostsModel.HostsType | networkModel.NetworkType;
  title: string;
  updateDateRange: UpdateDateRange;
}

export interface EventsOverTimeComponentReduxProps {
  isInspected: boolean;
}

export { MatrixHistogram };
