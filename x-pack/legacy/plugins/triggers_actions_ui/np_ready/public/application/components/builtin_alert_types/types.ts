/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface IndexThresholdAlertParams {
  index: string[];
  timeField: string;
  aggType: string;
  aggField?: string;
  groupBy: string;
  termSize: number;
  termField: string;
  thresholdComparator: string;
  threshold: number[];
  timeWindowSize?: number;
  timeWindowUnit?: string;
}
