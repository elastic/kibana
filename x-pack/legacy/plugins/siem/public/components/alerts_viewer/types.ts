/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { esFilters } from '../../../../../../../src/plugins/data/common';
import { HostsComponentsQueryProps } from '../../pages/hosts/navigation/types';
import { NetworkComponentQueryProps } from '../../pages/network/navigation/types';

type CommonQueryProps = HostsComponentsQueryProps | NetworkComponentQueryProps;
export interface AlertsComponentsQueryProps
  extends Pick<
    CommonQueryProps,
    | 'deleteQuery'
    | 'endDate'
    | 'filterQuery'
    | 'skip'
    | 'setQuery'
    | 'startDate'
    | 'type'
    | 'updateDateRange'
  > {
  pageFilters: esFilters.Filter[];
  defaultFilters?: esFilters.Filter[];
}
