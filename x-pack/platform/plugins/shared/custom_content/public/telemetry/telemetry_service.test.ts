/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart } from '@kbn/core/public';
import { CustomContentTelemetryService } from './telemetry_service';
import {
  CUSTOM_CONTENT_AGENT_UPDATE_APPLIED,
  CUSTOM_CONTENT_EDIT_FLYOUT_OPENED,
  CUSTOM_CONTENT_PANEL_SAVED,
} from './event_types';

describe('CustomContentTelemetryService', () => {
  const reportEvent = jest.fn();
  const service = new CustomContentTelemetryService({
    reportEvent,
  } as unknown as AnalyticsServiceStart);

  beforeEach(() => reportEvent.mockClear());

  it('reports the number of queries when the edit flyout opens', () => {
    service.trackEditFlyoutOpened({
      isNewPanel: false,
      hasTemplate: true,
      hasEsqlQuery: true,
      esqlQueryCount: 3,
    });
    expect(reportEvent).toHaveBeenCalledWith(CUSTOM_CONTENT_EDIT_FLYOUT_OPENED, {
      is_new_panel: false,
      has_template: true,
      has_esql_query: true,
      esql_query_count: 3,
    });
  });

  it('reports the number of queries a panel is saved with', () => {
    service.trackPanelSaved({
      isNewPanel: true,
      hasTemplate: true,
      hasEsqlQuery: true,
      esqlQueryCount: 2,
      templateSizeBytes: 10,
    });
    expect(reportEvent).toHaveBeenCalledWith(CUSTOM_CONTENT_PANEL_SAVED, {
      is_new_panel: true,
      has_template: true,
      has_esql_query: true,
      esql_query_count: 2,
      template_size_bytes: 10,
    });
  });

  it('reports the number of queries in an agent update', () => {
    service.trackAgentUpdateApplied({
      hasEsqlQuery: false,
      esqlQueryCount: 0,
      templateSizeBytes: 5,
    });
    expect(reportEvent).toHaveBeenCalledWith(CUSTOM_CONTENT_AGENT_UPDATE_APPLIED, {
      has_esql_query: false,
      esql_query_count: 0,
      template_size_bytes: 5,
    });
  });

  it('never lets a telemetry failure reach the feature', () => {
    reportEvent.mockImplementationOnce(() => {
      throw new Error('analytics down');
    });
    expect(() => service.trackPanelAdded('dashboard_panel')).not.toThrow();
  });
});
