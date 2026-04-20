/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { IlmExplainLifecycleResponse } from '@elastic/elasticsearch/lib/api/types';

import type { Index } from '../../../common/types';
import { sendGet } from '../../application/services/http';
import { IndexLifecycleSummary } from './index_lifecycle_summary';

jest.mock('../../application/services/http', () => ({
  sendGet: jest.fn(),
}));

// Mock useEuiTheme so the badge colors hook has a stable theme.
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: () => ({
    euiTheme: {
      colors: {
        vis: {
          euiColorVis3: '#BFDBFF',
        },
        severity: {
          risk: '#FF995E',
          warning: '#FCD883',
          neutral: '#B5E5F2',
        },
        backgroundBaseSubdued: '#CAD3E2',
      },
    },
  }),
}));

const flushMicrotasks = async () => {
  await Promise.resolve();
};

const getUrlForApp = (appId: string, options?: { path?: string }) => {
  return appId + '/' + (options?.path ?? '');
};

describe('IndexLifecycleSummary polling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (sendGet as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('shows refreshing callout and then renders action/step when explain returns full data', async () => {
    let resolveSendGet!: (value: unknown) => void;
    const deferred = new Promise((resolve) => {
      resolveSendGet = resolve;
    });
    (sendGet as jest.Mock).mockReturnValue(deferred);

    const indexName = 'testy_polling';
    const index: Index = {
      name: indexName,
      aliases: 'none',
      isFrozen: false,
      hidden: false,
      ilm: {
        index: indexName,
        managed: true,
        policy: 'testy',
        skip: false,
      } as any,
    };

    renderWithI18n(<IndexLifecycleSummary index={index} getUrlForApp={getUrlForApp} />);

    // Initially missing phase/action/step => should show refreshing panel.
    expect(screen.getByTestId('ilmExplainPendingPanel')).toBeInTheDocument();

    const response: IlmExplainLifecycleResponse = {
      indices: {
        [indexName]: {
          index: indexName,
          managed: true,
          policy: 'testy',
          phase: 'hot',
          action: 'complete',
          step: 'complete',
          action_time_millis: 1,
          step_time_millis: 1,
          phase_time_millis: 1,
          lifecycle_date_millis: 1,
          skip: false,
        } as any,
      },
    } as IlmExplainLifecycleResponse;

    await act(async () => {
      resolveSendGet(response);
      await flushMicrotasks();
    });

    expect(sendGet).toHaveBeenCalledWith('explain', { index: indexName });

    // Refreshing panel should disappear once we have full info.
    expect(screen.queryByTestId('ilmExplainPendingPanel')).not.toBeInTheDocument();

    // And the extra fields should render.
    expect(screen.getByText('Current action')).toBeInTheDocument();
    expect(screen.getAllByText('complete').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Current step')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(10_000);
      await flushMicrotasks();
    });

    expect((sendGet as jest.Mock).mock.calls.length).toBe(1);
  });

  test('polls until exhausted when explain stays incomplete', async () => {
    const indexName = 'testy_polling_incomplete';
    const index: Index = {
      name: indexName,
      aliases: 'none',
      isFrozen: false,
      hidden: false,
      ilm: {
        index: indexName,
        managed: true,
        policy: 'testy',
        skip: false,
      } as any,
    };

    const response: IlmExplainLifecycleResponse = {
      indices: {
        [indexName]: {
          index: indexName,
          managed: true,
          policy: 'testy',
          skip: false,
        } as any,
      },
    } as IlmExplainLifecycleResponse;

    (sendGet as jest.Mock).mockResolvedValue(response);

    renderWithI18n(<IndexLifecycleSummary index={index} getUrlForApp={getUrlForApp} />);

    expect(screen.getByTestId('ilmExplainPendingPanel')).toBeInTheDocument();

    await act(async () => {
      await flushMicrotasks();
    });
    expect((sendGet as jest.Mock).mock.calls.length).toBe(1);
    expect(screen.getByTestId('ilmExplainPendingPanel')).toBeInTheDocument();

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        jest.advanceTimersByTime(1_000);
        await flushMicrotasks();
      });
    }
    expect((sendGet as jest.Mock).mock.calls.length).toBe(6);

    expect(screen.queryByTestId('ilmExplainPendingPanel')).not.toBeInTheDocument();
    expect(screen.getByTestId('ilmExplainFailedPanel')).toBeInTheDocument();
  });

  test('stops showing refreshing panel after polling is exhausted', async () => {
    (sendGet as jest.Mock).mockRejectedValue(new Error('boom'));

    const indexName = 'testy_polling_exhausted';
    const index: Index = {
      name: indexName,
      aliases: 'none',
      isFrozen: false,
      hidden: false,
      ilm: {
        index: indexName,
        managed: true,
        policy: 'testy',
        skip: false,
      } as any,
    };

    renderWithI18n(<IndexLifecycleSummary index={index} getUrlForApp={getUrlForApp} />);

    expect(screen.getByTestId('ilmExplainPendingPanel')).toBeInTheDocument();

    await act(async () => {
      // First poll is immediate; flush so the rejection is handled + next poll is scheduled.
      await flushMicrotasks();
    });
    expect((sendGet as jest.Mock).mock.calls.length).toBe(1);

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        jest.advanceTimersByTime(1_000);
        await flushMicrotasks();
      });
    }
    expect((sendGet as jest.Mock).mock.calls.length).toBe(6);

    expect(screen.queryByTestId('ilmExplainPendingPanel')).not.toBeInTheDocument();
    expect(screen.getByTestId('ilmExplainFailedPanel')).toBeInTheDocument();
  });
});
