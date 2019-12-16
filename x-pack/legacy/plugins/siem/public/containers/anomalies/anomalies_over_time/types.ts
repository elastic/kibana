/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QueryTemplateProps } from '../../query_template';
import { inputsModel, hostsModel, networkModel } from '../../../store';
import { MatrixOverTimeHistogramData } from '../../../graphql/types';

export interface AnomaliesArgs {
  endDate: number;
  anomaliesOverTime: MatrixOverTimeHistogramData[];
  id: string;
  inspect: inputsModel.InspectQuery;
  loading: boolean;
  refetch: inputsModel.Refetch;
  startDate: number;
  totalCount: number;
}

export interface OwnProps extends Omit<QueryTemplateProps, 'filterQuery'> {
  filterQuery?: string;
  children?: (args: AnomaliesArgs) => React.ReactElement;
  type: hostsModel.HostsType | networkModel.NetworkType;
}

export interface AnomaliesOverTimeComponentReduxProps {
  isInspected: boolean;
}

export type AnomaliesOverTimeProps = OwnProps & AnomaliesOverTimeComponentReduxProps;
