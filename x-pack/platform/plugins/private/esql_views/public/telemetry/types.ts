/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ViewCreatedPayload {
  hasDescription: boolean;
  queryLength: number;
}

export interface ViewDeletedPayload {
  count: number;
}

/** Reports the ES|QL views management events. */
export interface EsqlViewsTelemetryClient {
  trackViewsPageVisited: () => void;
  trackViewCreated: (payload: ViewCreatedPayload) => void;
  trackViewEdited: () => void;
  trackViewDeleted: (payload: ViewDeletedPayload) => void;
}
