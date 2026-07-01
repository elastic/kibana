/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChangeHistoryTelemetryEventTypes } from './types';
import { createChangeHistoryTelemetryReporter } from './create_change_history_telemetry_reporter';
import { TEST_CHANGE_HISTORY_SCOPE } from '../test_utils/change_history_test_fixtures';

describe('createChangeHistoryTelemetryReporter', () => {
  it('reports events with scope fields and eventName merged', () => {
    const reportEvent = jest.fn();
    const telemetry = createChangeHistoryTelemetryReporter({
      analytics: { reportEvent },
      scope: TEST_CHANGE_HISTORY_SCOPE,
    });

    telemetry.reportOpened();
    telemetry.reportChangeSelected({
      hasSequence: true,
      selectionSource: 'user_click',
    });
    telemetry.reportDiffViewed({ comparisonType: 'vs_previous', versionDistance: 1 });
    telemetry.reportDiffChangeNavigated({ navigationSource: 'line_hunk' });

    expect(reportEvent).toHaveBeenCalledTimes(4);
    expect(reportEvent).toHaveBeenNthCalledWith(1, ChangeHistoryTelemetryEventTypes.Opened, {
      eventName: 'Change history opened',
      ...TEST_CHANGE_HISTORY_SCOPE,
    });
    expect(reportEvent).toHaveBeenNthCalledWith(
      2,
      ChangeHistoryTelemetryEventTypes.ChangeSelected,
      {
        eventName: 'Change history change selected',
        ...TEST_CHANGE_HISTORY_SCOPE,
        hasSequence: true,
        selectionSource: 'user_click',
      }
    );
    expect(reportEvent).toHaveBeenNthCalledWith(3, ChangeHistoryTelemetryEventTypes.DiffViewed, {
      eventName: 'Change history diff viewed',
      ...TEST_CHANGE_HISTORY_SCOPE,
      comparisonType: 'vs_previous',
      versionDistance: 1,
    });
    expect(reportEvent).toHaveBeenNthCalledWith(
      4,
      ChangeHistoryTelemetryEventTypes.DiffChangeNavigated,
      {
        eventName: 'Change history diff change navigated',
        ...TEST_CHANGE_HISTORY_SCOPE,
        navigationSource: 'line_hunk',
      }
    );
  });

  it('is a no-op when analytics is omitted', () => {
    const telemetry = createChangeHistoryTelemetryReporter({ scope: TEST_CHANGE_HISTORY_SCOPE });

    expect(() => telemetry.reportOpened()).not.toThrow();
  });

  it('is a no-op when enabled is false', () => {
    const reportEvent = jest.fn();
    const telemetry = createChangeHistoryTelemetryReporter({
      analytics: { reportEvent },
      scope: TEST_CHANGE_HISTORY_SCOPE,
      enabled: false,
    });

    telemetry.reportOpened();

    expect(reportEvent).not.toHaveBeenCalled();
  });

  it('does not throw when reportEvent fails', () => {
    const reportEvent = jest.fn().mockImplementation(() => {
      throw new Error('analytics unavailable');
    });
    const telemetry = createChangeHistoryTelemetryReporter({
      analytics: { reportEvent },
      scope: TEST_CHANGE_HISTORY_SCOPE,
    });

    expect(() => telemetry.reportRestoreFailed({ errorCode: 'RESTORE_CONFLICT' })).not.toThrow();
  });
});
