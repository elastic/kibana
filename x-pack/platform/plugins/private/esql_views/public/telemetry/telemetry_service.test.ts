/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { reportEsqlViewsError } from '../report_error';
import {
  ESQL_VIEWS_PAGE_VISITED,
  ESQL_VIEWS_TELEMETRY_SOURCE,
  ESQL_VIEW_CREATED,
  ESQL_VIEW_DELETED,
  ESQL_VIEW_EDITED,
} from './constants';
import { TelemetryService } from './telemetry_service';

jest.mock('../report_error', () => ({
  reportEsqlViewsError: jest.fn(),
}));

describe('TelemetryService', () => {
  afterEach(() => jest.clearAllMocks());

  const setupService = () => {
    const { analytics } = coreMock.createSetup();
    const service = new TelemetryService();
    service.setup(analytics);

    return { analytics, client: service.start() };
  };

  it('registers every event type during setup', () => {
    const { analytics } = setupService();

    // `esql.view_created` is registered by @kbn/esql-editor, which can emit it even when this
    // plugin's management UI is disabled.
    expect(analytics.registerEventType.mock.calls.map(([{ eventType }]) => eventType)).toEqual([
      ESQL_VIEWS_PAGE_VISITED,
      ESQL_VIEW_EDITED,
      ESQL_VIEW_DELETED,
    ]);
  });

  it('throws when a client is requested before setup', () => {
    expect(() => new TelemetryService().start()).toThrow(
      'TelemetryService.setup() has not been invoked, be sure to call it before start().'
    );
  });

  it('reports a page visit without any properties', () => {
    const { analytics, client } = setupService();

    client.trackViewsPageVisited();

    expect(analytics.reportEvent).toHaveBeenCalledWith(ESQL_VIEWS_PAGE_VISITED, {});
  });

  it('reports a created view with the query length rather than the query', () => {
    const { analytics, client } = setupService();

    client.trackViewCreated({ hasDescription: true, queryLength: 19 });

    expect(analytics.reportEvent).toHaveBeenCalledWith(ESQL_VIEW_CREATED, {
      source: ESQL_VIEWS_TELEMETRY_SOURCE,
      has_description: true,
      query_length: 19,
    });
  });

  it('reports an edited view', () => {
    const { analytics, client } = setupService();

    client.trackViewEdited();

    expect(analytics.reportEvent).toHaveBeenCalledWith(ESQL_VIEW_EDITED, {
      source: ESQL_VIEWS_TELEMETRY_SOURCE,
    });
  });

  it('reports a deleted view with the number of views submitted', () => {
    const { analytics, client } = setupService();

    client.trackViewDeleted({ count: 3 });

    expect(analytics.reportEvent).toHaveBeenCalledWith(ESQL_VIEW_DELETED, {
      source: ESQL_VIEWS_TELEMETRY_SOURCE,
      count: 3,
    });
  });

  it('reports a failure to send instead of letting it escape to the caller', () => {
    const { analytics, client } = setupService();
    const failure = new Error('Event Type "esql.view_created" is not registered.');
    analytics.reportEvent.mockImplementation(() => {
      throw failure;
    });

    expect(() => client.trackViewCreated({ hasDescription: true, queryLength: 1 })).not.toThrow();
    expect(() => client.trackViewEdited()).not.toThrow();
    expect(() => client.trackViewDeleted({ count: 1 })).not.toThrow();
    expect(() => client.trackViewsPageVisited()).not.toThrow();

    expect(reportEsqlViewsError).toHaveBeenCalledWith(failure, {
      errorType: 'TelemetryEvent',
      labels: { event_type: ESQL_VIEW_CREATED },
    });
  });

  it('reports stack_management as the source of every view change', () => {
    const { analytics, client } = setupService();

    client.trackViewCreated({ hasDescription: false, queryLength: 1 });
    client.trackViewEdited();
    client.trackViewDeleted({ count: 1 });

    expect(analytics.reportEvent).toHaveBeenCalledTimes(3);
    for (const [, payload] of analytics.reportEvent.mock.calls) {
      expect(payload).toMatchObject({ source: 'stack_management' });
    }
  });
});
