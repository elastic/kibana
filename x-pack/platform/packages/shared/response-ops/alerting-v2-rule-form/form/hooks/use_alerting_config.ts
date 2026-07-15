/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { useQuery } from '@kbn/react-query';
import { ALERTING_V2_RULES_CONFIG_API_PATH } from '@kbn/alerting-v2-constants';
import { ruleFormKeys } from './query_key_factory';

export interface AlertingConfig {
  minimumScheduleInterval: string;
}

export const useAlertingConfig = ({ http }: { http: HttpStart }) =>
  useQuery<AlertingConfig, Error>({
    queryKey: ruleFormKeys.config(),
    queryFn: () => http.get<AlertingConfig>(ALERTING_V2_RULES_CONFIG_API_PATH),
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    retry: false,
  });
