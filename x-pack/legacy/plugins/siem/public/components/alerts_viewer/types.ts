/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostsComponentsQueryProps } from '../../pages/hosts/navigation/types';
import { NetworkComponentQueryProps } from '../../pages/network/navigation/types';

export interface PageFilterDsl {
  exists: {
    field: string;
  };
}

export type AlertsComponentPageFilterDsl = Array<{
  bool: {
    should: PageFilterDsl[];
    minimum_should_match: number;
  };
}>;

export type AlertsComponentsQueryProps = HostsComponentsQueryProps | NetworkComponentQueryProps;
