/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ErrorGroupMainStatisticsResponse {
  errorGroups: Array<{
    groupId: string;
    name: string;
    lastSeen: number;
    occurrences: number;
    culprit: string | undefined;
    handled: boolean | undefined;
    type: string | undefined;
    traceId: string | undefined;
  }>;
  maxCountExceeded: boolean;
}
