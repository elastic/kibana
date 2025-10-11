/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// filepath: /Users/elenastoeva/elastic/kibana/x-pack/platform/plugins/shared/streams_app/public/components/data_management/stream_detail_lifecycle/failure_store/cards/ingestion_card.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { IngestionCard } from './ingestion_card';

jest.mock('../../helpers/format_bytes', () => ({
  formatBytes: (n: number) => `${n}B`,
}));

// Capture props passed to wrapper to assert privilege flag behavior
const wrapperCalls: any[] = [];
jest.mock('../../../../insufficient_privileges/insufficient_privileges', () => ({
  PrivilegesWarningIconWrapper: (p: any) => {
    wrapperCalls.push(p);
    return <>{p.children}</>;
  },
}));

// Mock BaseMetricCard to render metrics plainly
jest.mock('../../common/base_metric_card', () => ({
  BaseMetricCard: ({ title, metrics }: any) => (
    <div data-test-subj="baseMetricCard">
      <div data-test-subj="cardTitle">
        {typeof title === 'string' ? title : <span data-test-subj="titleNode">{title}</span>}
      </div>
      {metrics.map((m: any) => (
        <div key={m['data-test-subj']} data-test-subj={m['data-test-subj']}>
          <span data-test-subj="metricData">{m.data}</span>
          <span data-test-subj="metricSubtitle">{m.subtitle}</span>
        </div>
      ))}
    </div>
  ),
}));

const makeDefinition = (canManage = true) =>
  ({
    privileges: { manage_failure_store: canManage },
  } as any);

// Helper to ensure react-intl context is available
const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('IngestionCard', () => {
  beforeEach(() => {
    wrapperCalls.length = 0;
    jest.clearAllMocks();
  });

  it('renders daily & monthly averages with stats and privileges', () => {
    renderWithI18n(
      <IngestionCard definition={makeDefinition(true)} stats={{ bytesPerDay: 1000 } as any} />
    );

    const daily = screen.getByTestId('failureStoreIngestionDaily');
    const monthly = screen.getByTestId('failureStoreIngestionMonthly');

    expect(daily.querySelector('[data-test-subj="metricData"]')!.textContent).toBe('1000B');
    expect(monthly.querySelector('[data-test-subj="metricData"]')!.textContent).toBe('30000B');

    expect(wrapperCalls).toHaveLength(2);
    wrapperCalls.forEach((c) => expect(c.hasPrivileges).toBe(true));
  });

  it('shows dash for both metrics when stats missing', () => {
    renderWithI18n(<IngestionCard definition={makeDefinition(true)} />);
    expect(
      screen
        .getByTestId('failureStoreIngestionDaily')
        .querySelector('[data-test-subj="metricData"]')!.textContent
    ).toBe('-');
    expect(
      screen
        .getByTestId('failureStoreIngestionMonthly')
        .querySelector('[data-test-subj="metricData"]')!.textContent
    ).toBe('-');
  });

  it('shows dash when statsError present even if stats provided', () => {
    renderWithI18n(
      <IngestionCard
        definition={makeDefinition(true)}
        stats={{ bytesPerDay: 2048 } as any}
        statsError={new Error('boom')}
      />
    );
    expect(
      screen
        .getByTestId('failureStoreIngestionDaily')
        .querySelector('[data-test-subj="metricData"]')!.textContent
    ).toBe('-');
    expect(
      screen
        .getByTestId('failureStoreIngestionMonthly')
        .querySelector('[data-test-subj="metricData"]')!.textContent
    ).toBe('-');
  });

  it('shows dash when stats provided but bytesPerDay missing', () => {
    renderWithI18n(
      <IngestionCard definition={makeDefinition(true)} stats={{ someOther: 1 } as any} />
    );
    expect(
      screen
        .getByTestId('failureStoreIngestionDaily')
        .querySelector('[data-test-subj="metricData"]')!.textContent
    ).toBe('-');
    expect(
      screen
        .getByTestId('failureStoreIngestionMonthly')
        .querySelector('[data-test-subj="metricData"]')!.textContent
    ).toBe('-');
  });

  it('renders metrics when lacking privileges (wrapper flagged false)', () => {
    renderWithI18n(
      <IngestionCard definition={makeDefinition(false)} stats={{ bytesPerDay: 500 } as any} />
    );
    expect(
      screen
        .getByTestId('failureStoreIngestionDaily')
        .querySelector('[data-test-subj="metricData"]')!.textContent
    ).toBe('500B');
    expect(
      screen
        .getByTestId('failureStoreIngestionMonthly')
        .querySelector('[data-test-subj="metricData"]')!.textContent
    ).toBe('15000B');
    wrapperCalls.forEach((c) => expect(c.hasPrivileges).toBe(false));
  });
});
