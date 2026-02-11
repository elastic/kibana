/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { StorageSizeCard } from './storage_size_card';

describe('StorageSizeCard', () => {
  it('renders formatted size and documents when stats + privileges present', () => {
    render(
      <StorageSizeCard
        hasPrivileges={true}
        stats={{ size: 2048, count: 321, bytesPerDay: 0, bytesPerDoc: 0, perDayDocs: 0 }}
      />
    );
    expect(screen.getByTestId('failureStoreStorageSize-title')).toBeInTheDocument();
    expect(screen.getByTestId('failureStoreStorageSize-metric')).toHaveTextContent(/2(\.0)?\s?KB/);
    expect(screen.getByTestId('failureStoreStorageSize-metric-subtitle')).toHaveTextContent(
      /321 documents/
    );

    // There should be no warning icon when user has privileges
    expect(
      screen.queryByTestId('streamsInsufficientPrivileges-storageSize')
    ).not.toBeInTheDocument();
  });

  it('shows dash for size and docs when stats missing', () => {
    render(<StorageSizeCard hasPrivileges={true} />);
    expect(screen.getByTestId('failureStoreStorageSize-metric')).toBeInTheDocument();
    expect(screen.getByTestId('failureStoreStorageSize-metric')).toHaveTextContent('-');
    expect(screen.getByTestId('failureStoreStorageSize-metric-subtitle')).toHaveTextContent(
      /- documents/
    );
  });

  it('shows dash when statsError present even if stats exist', () => {
    render(
      <StorageSizeCard
        hasPrivileges={true}
        stats={{ size: 4096, count: 10, bytesPerDay: 0, bytesPerDoc: 0, perDayDocs: 0 }}
        statsError={new Error('boom')}
      />
    );
    expect(screen.getByTestId('failureStoreStorageSize-metric')).toBeInTheDocument();
    expect(screen.getByTestId('failureStoreStorageSize-metric')).toHaveTextContent('-');
    expect(screen.getByTestId('failureStoreStorageSize-metric-subtitle')).toHaveTextContent(
      /- documents/
    );
  });

  it('shows warning icon when lacking privileges', () => {
    render(
      <StorageSizeCard
        hasPrivileges={false}
        stats={{ size: 100, count: 5, bytesPerDay: 0, bytesPerDoc: 0, perDayDocs: 0 }}
      />
    );
    expect(screen.getByTestId('failureStoreStorageSize-metric')).toBeInTheDocument();
    expect(screen.getByTestId('streamsInsufficientPrivileges-storageSize')).toBeInTheDocument();
  });

  it('shows dash if size present but count missing', () => {
    render(<StorageSizeCard hasPrivileges={true} stats={{ size: 512 } as any} />);
    expect(screen.getByTestId('failureStoreStorageSize-metric')).toBeInTheDocument();
    expect(screen.getByTestId('failureStoreStorageSize-metric')).toHaveTextContent(/512(\.0)?\s?B/);
    expect(screen.getByTestId('failureStoreStorageSize-metric-subtitle')).toHaveTextContent(
      /- documents/
    );
  });
});
