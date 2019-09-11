/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isRight } from 'fp-ts/lib/Either';
import { InfraApmMetrics, InfraApmMetricsRT } from '../../common/http_api';

export const isInfraApmMetrics = (subject: any): subject is InfraApmMetrics => {
  return isRight(InfraApmMetricsRT.decode(subject)) != null;
};
