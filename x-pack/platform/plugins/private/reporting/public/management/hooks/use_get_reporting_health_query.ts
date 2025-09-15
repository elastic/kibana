/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { HttpSetup } from '@kbn/core/public';
import { getReportingHealth } from '../apis/get_reporting_health';
import { queryKeys } from '../query_keys';

export const getKey = queryKeys.getHealth;

export const useGetReportingHealthQuery = ({ http }: { http: HttpSetup }) => {
  return useQuery({
    queryKey: getKey(),
    queryFn: () => getReportingHealth({ http }),
  });
};
