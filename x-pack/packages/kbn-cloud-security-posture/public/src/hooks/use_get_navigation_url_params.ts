/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core-lifecycle-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useCallback } from 'react';
import { CspClientPluginStartDeps } from '../types';
import { encodeQueryUrl, queryFilters } from '../utils/query_utils';
import { NavFilter } from './use_navigate_findings';

export const useGetNavigationUrlParams = () => {
  const { services } = useKibana<CoreStart & CspClientPluginStartDeps>();

  return useCallback(
    (filterParams: NavFilter = {}, groupBy?: string[]) => {
      const filters = queryFilters(filterParams);

      const searchParams = new URLSearchParams(encodeQueryUrl(services, filters, groupBy));

      return `?${searchParams.toString()}`;
    },
    [services]
  );
};
