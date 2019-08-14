/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JobType } from './log_analysis';

export const getJobIdPrefix = (spaceId: string, sourceId: string) =>
  `kibana-logs-ui-${spaceId}-${sourceId}-`;

export const getJobId = (spaceId: string, sourceId: string, jobType: JobType) =>
  `${getJobIdPrefix(spaceId, sourceId)}${jobType}`;
