/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { StorageSizeCard } from './storage_size_card';

// Mock formatBytes to keep output predictable
jest.mock('../../helpers/format_bytes', () => ({
  formatBytes: (n: number) => `${n}B`, // simple passthrough
}));

// Mock PrivilegesWarningIconWrapper to render children directly
jest.mock('../../../../insufficient_privileges/insufficient_privileges', () => ({
  PrivilegesWarningIconWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock BaseMetricCard to expose metrics directly for assertions
jest.mock('../../common/base_metric_card', () => ({
  BaseMetricCard: ({ title, metrics }: any) => (
    <div data-test-subj="baseMetricCard">
      <h3>{title}</h3>
      {metrics.map((m: any) => (
        <div key={m['data-test-subj']} data-test-subj={m['data-test-subj']}>
          <div data-test-subj="metricData">{m.data}</div>
          {m.subtitle && <div data-test-subj="metricSubtitle">{m.subtitle}</div>}
        </div>
      ))}
    </div>
  ),
}));

const makeDefinition = (manage = true) =>
  ({
    privileges: { manage_failure_store: manage },
  } as any);

describe('StorageSizeCard', () => {
  it('renders formatted size and documents when stats + privileges present', () => {
    render(
      <StorageSizeCard
        definition={makeDefinition(true)}
        stats={{ size: 2048, count: 321, bytesPerDay: 0, bytesPerDoc: 0 }}
      />
    );
    expect(screen.getByRole('heading', { name: /Failure storage size/i })).toBeInTheDocument();

    const metric = screen.getByTestId('failureStoreStorageSize');
    expect(metric.querySelector('[data-test-subj="metricData"]')!.textContent).toBe('2048B');
    expect(metric.querySelector('[data-test-subj="metricSubtitle"]')!.textContent).toMatch(
      /321 documents/
    );
  });

  it('shows dash for size and docs when stats missing', () => {
    render(<StorageSizeCard definition={makeDefinition(true)} />);
    const metric = screen.getByTestId('failureStoreStorageSize');
    expect(metric.querySelector('[data-test-subj="metricData"]')!.textContent).toBe('-');
    expect(metric.querySelector('[data-test-subj="metricSubtitle"]')!.textContent).toMatch(
      /- documents/
    );
  });

  it('shows dash when statsError present even if stats exist', () => {
    render(
      <StorageSizeCard
        definition={makeDefinition(true)}
        stats={{ size: 4096, count: 10, bytesPerDay: 0, bytesPerDoc: 0 }}
        statsError={new Error('boom')}
      />
    );
    const metric = screen.getByTestId('failureStoreStorageSize');
    expect(metric.querySelector('[data-test-subj="metricData"]')!.textContent).toBe('-');
    expect(metric.querySelector('[data-test-subj="metricSubtitle"]')!.textContent).toMatch(
      /- documents/
    );
  });

  it('hides subtitle when lacking privileges', () => {
    render(
      <StorageSizeCard
        definition={makeDefinition(false)}
        stats={{ size: 100, count: 5, bytesPerDay: 0, bytesPerDoc: 0 }}
      />
    );
    const metric = screen.getByTestId('failureStoreStorageSize');
    expect(metric.querySelector('[data-test-subj="metricData"]')!.textContent).toBe('100B');
    expect(metric.querySelector('[data-test-subj="metricSubtitle"]')).toBeNull();
  });

  it('shows dash if size present but count missing', () => {
    render(<StorageSizeCard definition={makeDefinition(true)} stats={{ size: 512 } as any} />);
    const metric = screen.getByTestId('failureStoreStorageSize');
    expect(metric.querySelector('[data-test-subj="metricData"]')!.textContent).toBe('512B');
    expect(metric.querySelector('[data-test-subj="metricSubtitle"]')!.textContent).toMatch(
      /- documents/
    );
  });
});
