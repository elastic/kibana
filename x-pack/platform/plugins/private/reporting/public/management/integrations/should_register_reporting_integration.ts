/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { getKey as getReportingHealthQueryKey } from '../hooks/use_get_reporting_health_query';
import { getReportingHealth } from '../apis/get_reporting_health';
import { queryClient } from '../../query_client';

export const shouldRegisterReportingIntegration = async (http: HttpSetup) => {
  const { isSufficientlySecure, hasPermanentEncryptionKey } = await queryClient.fetchQuery({
    queryKey: getReportingHealthQueryKey(),
    queryFn: () => getReportingHealth({ http }),
  });
  return isSufficientlySecure && hasPermanentEncryptionKey;
};
