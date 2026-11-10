/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import {
  ESQL_VIEWS_PAGE_VISITED,
  ESQL_VIEWS_TELEMETRY_SOURCE,
  ESQL_VIEW_CREATED,
  ESQL_VIEW_DELETED,
  ESQL_VIEW_EDITED,
} from './constants';
import { reportEsqlViewsError } from '../report_error';
import type { EsqlViewsTelemetryClient, ViewCreatedPayload, ViewDeletedPayload } from './types';

export class TelemetryClient implements EsqlViewsTelemetryClient {
  constructor(private readonly analytics: AnalyticsServiceSetup) {}

  // Callers emit inside their own `try`, so a throw here would surface as a failed save or delete.
  private report(eventType: string, eventData: Record<string, unknown>): void {
    try {
      this.analytics.reportEvent(eventType, eventData);
    } catch (error) {
      reportEsqlViewsError(error, {
        errorType: 'TelemetryEvent',
        labels: { event_type: eventType },
      });
    }
  }

  public trackViewsPageVisited = (): void => {
    this.report(ESQL_VIEWS_PAGE_VISITED, {});
  };

  public trackViewCreated = ({ hasDescription, queryLength }: ViewCreatedPayload): void => {
    this.report(ESQL_VIEW_CREATED, {
      source: ESQL_VIEWS_TELEMETRY_SOURCE,
      has_description: hasDescription,
      query_length: queryLength,
    });
  };

  public trackViewEdited = (): void => {
    this.report(ESQL_VIEW_EDITED, {
      source: ESQL_VIEWS_TELEMETRY_SOURCE,
    });
  };

  public trackViewDeleted = ({ count }: ViewDeletedPayload): void => {
    this.report(ESQL_VIEW_DELETED, {
      source: ESQL_VIEWS_TELEMETRY_SOURCE,
      count,
    });
  };
}
