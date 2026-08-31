/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AlertTimelineSection } from './alert_timeline_section';

const mockUseFetchRuleEvents = jest.fn();
let capturedOnRefresh: (() => void) | undefined;

jest.mock('../../../../hooks/use_fetch_rule_events', () => ({
  useFetchRuleEvents: (...args: unknown[]) => mockUseFetchRuleEvents(...args),
}));

jest.mock('./use_alert_timeline_url_state', () => ({
  useAlertTimelineUrlState: () => [{ from: 'now-7d', to: 'now' }, jest.fn()],
}));

jest.mock('../../../../utils/discover_href_for_episode', () => ({
  getDiscoverHrefForRuleQuery: () => '/discover',
}));

jest.mock('../../rule_context', () => ({
  useRule: () => ({
    id: 'rule-1',
    grouping: { fields: [] },
    query: { format: 'composed', base: 'FROM logs-*', breach: { segment: '' } },
  }),
}));

jest.mock('@kbn/alerting-v2-browser-shared', () => ({
  AlertingDateRangePicker: ({
    onRefresh,
    'data-test-subj': dataTestSubj,
  }: {
    onRefresh?: () => void;
    'data-test-subj'?: string;
  }) => {
    capturedOnRefresh = onRefresh;
    return <div data-test-subj={dataTestSubj} />;
  },
}));

const mockServices: Record<string, unknown> = {
  data: {},
  share: {},
  application: { capabilities: {}, navigateToUrl: jest.fn() },
  uiSettings: { get: jest.fn(() => 'Browser') },
  http: { basePath: { prepend: (path: string) => path } },
  notifications: { toasts: { addDanger: jest.fn(), addWarning: jest.fn() } },
};

jest.mock('@kbn/core-di-browser', () => ({
  CoreStart: (key: string) => key,
  useService: (token: string) => mockServices[token],
}));

jest.mock('@kbn/core-di', () => ({
  PluginStart: (key: string) => key,
}));

const successResult = {
  phases: [],
  groupingValuesByHash: {},
  summary: { episodesStarted: 0, recovered: 0, stillOpen: 0, medianDurationMs: 0 },
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

const renderSection = () =>
  render(
    <I18nProvider>
      <AlertTimelineSection />
    </I18nProvider>
  );

describe('AlertTimelineSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    capturedOnRefresh = undefined;
    mockUseFetchRuleEvents.mockReturnValue(successResult);
  });

  it('renders the section with an empty prompt when there are no episodes', () => {
    renderSection();
    expect(screen.getByTestId('ruleAlertTimelineSection')).toBeInTheDocument();
    expect(screen.getByTestId('alertTimelineDatePicker')).toBeInTheDocument();
    expect(screen.getByTestId('alertTimelineSectionEmpty')).toBeInTheDocument();
  });

  it('shows the loading state while fetching', () => {
    mockUseFetchRuleEvents.mockReturnValue({ ...successResult, isLoading: true });
    renderSection();
    expect(screen.getByTestId('alertTimelineSectionLoading')).toBeInTheDocument();
  });

  it('shows the error callout when the fetch fails', () => {
    mockUseFetchRuleEvents.mockReturnValue({
      ...successResult,
      isError: true,
    });
    renderSection();
    expect(screen.getByTestId('ruleAlertTimelineSection')).toBeInTheDocument();
    expect(screen.getByTestId('alertTimelineSectionError')).toBeInTheDocument();
  });

  it('refetches when refresh is pressed', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-14T12:00:00.000Z'));
    renderSection();

    act(() => {
      capturedOnRefresh?.();
    });

    expect(successResult.refetch).toHaveBeenCalledTimes(1);
  });

  it('slides a relative window forward on refresh without calling refetch', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-14T12:00:00.000Z'));
    renderSection();
    mockUseFetchRuleEvents.mockClear();

    jest.setSystemTime(new Date('2026-08-14T12:05:00.000Z'));
    act(() => {
      capturedOnRefresh?.();
    });

    expect(successResult.refetch).not.toHaveBeenCalled();
    expect(mockUseFetchRuleEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        windowStartMs: Date.parse('2026-08-07T12:05:00.000Z'),
        windowEndMs: Date.parse('2026-08-14T12:05:00.000Z'),
      })
    );
    jest.useRealTimers();
  });
});
