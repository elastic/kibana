/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricData } from '../graphql/types';

export const isInfraMetricData = (subject: any): subject is InfraMetricData => {
  return subject.series && Array.isArray(subject.series);
};
