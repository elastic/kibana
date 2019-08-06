/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraApmMetrics, InfraApmMetricsRT } from '../../common/http_api';

export const isInfraApmMetrics = (subject: any): subject is InfraApmMetrics => {
  const result = InfraApmMetricsRT.decode(subject);
  return result.isRight() != null;
};
