/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { createMockLocators, MockLocatorProvider } from '../../../../test_utils/test_providers';
import { AlertTimelineSection } from './alert_timeline_section';
import { AlertingV2EpisodesLocatorDefinition } from '../../../../locators';

const mockLocators = createMockLocators();

const mockUseFetchRuleEvents = vi.fn();
let capturedOnRefresh: (() => void) | undefined;

vi.mock('../../../../hooks/use_fetch_rule_events', () => {
  const mocked = {
    useFetchRuleEvents: (...args: unknown[]) => mockUseFetchRuleEvents(...args),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./use_alert_timeline_url_state', () => {
  const mocked = {
    useAlertTimelineUrlState: () => [{ from: 'now-24h', to: 'now' }, vi.fn()],
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../utils/discover_href_for_episode', () => {
  const mocked = {
    getDiscoverHrefForRuleQuery: () => '/discover',
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../rule_context', () => {
  const mocked = {
    useRule: () => ({
      id: 'rule-1',
      grouping: { fields: [] },
      query: { base: 'FROM logs-*' },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/alerting-v2-browser-shared', () => {
  const mocked = {
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
  };
  return { ...mocked, default: mocked };
});

const mockServices: Record<string, unknown> = {
  data: {},
  share: {},
  application: { capabilities: {}, navigateToUrl: vi.fn() },
  uiSettings: { get: vi.fn(() => 'Browser') },
  http: { basePath: { prepend: (path: string) => path } },
  notifications: { toasts: { addDanger: vi.fn(), addWarning: vi.fn() } },
};

vi.mock('@kbn/core-di-browser', () => {
  const mocked = {
    CoreStart: (key: string) => key,
    useService: (token: string) => mockServices[token],
  };
  return { ...mocked, default: mocked };
});

const successResult = {
  phases: [],
  groupingValuesByHash: {},
  summary: { episodesStarted: 0, recovered: 0, stillOpen: 0, medianDurationMs: 0 },
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

const renderSection = () =>
  render(
    <MockLocatorProvider locators={mockLocators}>
      <I18nProvider>
        <AlertTimelineSection />
      </I18nProvider>
    </MockLocatorProvider>
  );

describe('AlertTimelineSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
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
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-14T12:00:00.000Z'));
    renderSection();

    act(() => {
      capturedOnRefresh?.();
    });

    expect(successResult.refetch).toHaveBeenCalledTimes(1);
  });

  it('passes time-window deps to episodes.useUrl so the href tracks the selected range', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-14T12:00:00.000Z'));
    renderSection();

    const windowStartMs = Date.parse('2026-08-13T12:00:00.000Z');
    const windowEndMs = Date.parse('2026-08-14T12:00:00.000Z');
    const { episodesLocators } = mockLocators;

    expect(episodesLocators.useUrl).toHaveBeenCalledWith(
      {
        filters: { ruleId: 'rule-1', status: 'all' },
        timeRange: {
          from: new Date(windowStartMs).toISOString(),
          to: new Date(windowEndMs).toISOString(),
        },
      },
      undefined,
      ['rule-1', windowStartMs, windowEndMs]
    );
    vi.useRealTimers();
  });

  it('episodes link params resolve to management episodes URL with filters', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-14T12:00:00.000Z'));
    renderSection();

    const { episodesLocators } = mockLocators;
    const [params] = vi.mocked(episodesLocators.useUrl).mock.calls[0];
    const location = await AlertingV2EpisodesLocatorDefinition.getLocation(params);
    expect(location.app).toBe('management');
    expect(location.path).toMatch(/^\/alertingV2\/episodes\?_a=/);
    vi.useRealTimers();
  });

  it('slides a relative window forward on refresh without calling refetch', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-14T12:00:00.000Z'));
    renderSection();
    mockUseFetchRuleEvents.mockClear();

    vi.setSystemTime(new Date('2026-08-14T12:05:00.000Z'));
    act(() => {
      capturedOnRefresh?.();
    });

    expect(successResult.refetch).not.toHaveBeenCalled();
    expect(mockUseFetchRuleEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        windowStartMs: Date.parse('2026-08-13T12:05:00.000Z'),
        windowEndMs: Date.parse('2026-08-14T12:05:00.000Z'),
      })
    );
    vi.useRealTimers();
  });
});
