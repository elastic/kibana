/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RetentionCard } from './retention_card';

// Mock discover link hook
jest.mock('../../hooks/use_failure_store_redirect_link', () => ({
  useFailureStoreRedirectLink: () => ({ href: '/app/discover#/?_a=test' }),
}));

// Mock formatter for deterministic output
jest.mock('../../helpers/format_size_units', () => ({
  getTimeSizeAndUnitLabel: (p: any) => (p ? `${p.size}${p.unit}` : 'N/A'),
}));

// Mock Streams schema (only pieces used). We define the jest.fn inside the factory to
// avoid referencing a TDZ variable (Jest hoists jest.mock calls). We'll grab the fn
// after import via Streams.WiredStream.GetResponse.is.
jest.mock('@kbn/streams-schema', () => {
  const wiredIs = jest.fn(() => false);
  return {
    Streams: {
      WiredStream: { GetResponse: { is: wiredIs } },
      ingest: { all: { GetResponse: { is: () => true } } },
    },
  };
});

// Import after mock so we can access and control the mock function
import { Streams } from '@kbn/streams-schema';
const mockWiredIs = Streams.WiredStream.GetResponse.is as unknown as jest.Mock;

// Mock BaseMetricCard to expose props
jest.mock('../../common/base_metric_card', () => ({
  BaseMetricCard: (p: any) => {
    return (
      <div data-test-subj="baseMetricCard">
        <h3>{p.title}</h3>
        <div data-test-subj="actions">
          {p.actions?.map((a: any) => (
            <button
              key={a['data-test-subj']}
              data-test-subj={a['data-test-subj']}
              onClick={a.onClick}
              aria-label={a.ariaLabel}
            >
              {a['data-test-subj']}
            </button>
          ))}
        </div>
        {p.metrics?.map((m: any) => (
          <div key={m['data-test-subj']} data-test-subj={m['data-test-subj']}>
            <span data-test-subj="metricData">{m.data}</span>
            <span data-test-subj="metricSubtitle">{m.subtitle}</span>
          </div>
        ))}
      </div>
    );
  },
}));

const makeDefinition = (canManage = true) =>
  ({
    privileges: { manage_failure_store: canManage },
  } as any);

const customFailureStore = {
  retentionPeriod: {
    custom: { size: 7, unit: 'd' },
  },
};

const defaultFailureStore = {
  retentionPeriod: {
    default: { size: 30, unit: 'd' },
  },
};

const renderI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('RetentionCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWiredIs.mockReturnValue(false);
  });

  it('returns null when failureStore missing', () => {
    const { container } = renderI18n(
      <RetentionCard openModal={jest.fn()} definition={makeDefinition()} failureStore={undefined} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when retentionPeriod missing', () => {
    const { container } = renderI18n(
      <RetentionCard openModal={jest.fn()} definition={makeDefinition()} failureStore={{} as any} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders custom retention metric and subtitle', () => {
    renderI18n(
      <RetentionCard
        openModal={jest.fn()}
        definition={makeDefinition(true)}
        failureStore={customFailureStore as any}
      />
    );
    const metric = screen.getByTestId('failureStoreRetention');
    expect(metric.querySelector('[data-test-subj="metricData"]')!.textContent).toBe('7d');
    expect(metric.querySelector('[data-test-subj="metricSubtitle"]')!.textContent).toMatch(
      /Custom retention period/i
    );
  });

  it('renders default retention metric and subtitle', () => {
    renderI18n(
      <RetentionCard
        openModal={jest.fn()}
        definition={makeDefinition(true)}
        failureStore={defaultFailureStore as any}
      />
    );
    const metric = screen.getByTestId('failureStoreRetention');
    expect(metric.querySelector('[data-test-subj="metricData"]')!.textContent).toBe('30d');
    expect(metric.querySelector('[data-test-subj="metricSubtitle"]')!.textContent).toMatch(
      /Default retention period/i
    );
  });

  it('includes edit & discover actions when privileged and not wired', () => {
    const openModal = jest.fn();
    renderI18n(
      <RetentionCard
        openModal={openModal}
        definition={makeDefinition(true)}
        failureStore={defaultFailureStore as any}
      />
    );
    fireEvent.click(screen.getByTestId('streamFailureStoreEditRetention'));
    expect(openModal).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('streamFailureStoreViewInDiscover')).toBeInTheDocument();
  });

  it('omits edit action when lacking privilege', () => {
    renderI18n(
      <RetentionCard
        openModal={jest.fn()}
        definition={makeDefinition(false)}
        failureStore={defaultFailureStore as any}
      />
    );
    expect(screen.queryByTestId('streamFailureStoreEditRetention')).toBeNull();
    expect(screen.getByTestId('streamFailureStoreViewInDiscover')).toBeInTheDocument();
  });

  it('omits edit action when stream is wired even if privileged', () => {
    mockWiredIs.mockReturnValue(true);
    renderI18n(
      <RetentionCard
        openModal={jest.fn()}
        definition={makeDefinition(true)}
        failureStore={defaultFailureStore as any}
      />
    );
    expect(screen.queryByTestId('streamFailureStoreEditRetention')).toBeNull();
    expect(screen.getByTestId('streamFailureStoreViewInDiscover')).toBeInTheDocument();
  });
});
