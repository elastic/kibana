/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '../../../../../../../src/plugins/data/public';
import { HostsComponentsQueryProps } from '../../pages/hosts/navigation/types';
import { NetworkComponentQueryProps } from '../../pages/network/navigation/types';
import { MatrixHistogramOption } from '../matrix_histogram/types';

type CommonQueryProps = HostsComponentsQueryProps | NetworkComponentQueryProps;
export interface AlertsComponentsQueryProps
  extends Pick<
    CommonQueryProps,
    'deleteQuery' | 'endDate' | 'filterQuery' | 'skip' | 'setQuery' | 'startDate' | 'type'
  > {
  pageFilters: Filter[];
  stackByOptions?: MatrixHistogramOption[];
  defaultFilters?: Filter[];
  defaultStackByOption?: MatrixHistogramOption;
}
