/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { RuleApiResponse } from '../../../services/rules_api';
import { RuleProvider } from '../rule_context';
import { RuleMetadata } from './rule_metadata';

jest.mock('@kbn/core-di-browser');

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;
const mockBulkGet = jest.fn();

const ALICE_UID = 'u_alice_uid';
const BOB_UID = 'u_bob_uid';

const baseRule: RuleApiResponse = {
  id: 'rule-1',
  kind: 'signal',
  enabled: true,
  metadata: { name: 'Test Signal Rule' },
  createdBy: ALICE_UID,
  createdAt: '2026-03-01T12:00:00.000Z',
  updatedBy: BOB_UID,
  updatedAt: '2026-03-04T12:00:00.000Z',
  time_field: '',
  schedule: {
    every: '',
    lookback: 'now-1h',
  },
  evaluation: {
    query: {
      base: '',
    },
  },
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const renderMetadata = (rule: RuleApiResponse) =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <I18nProvider>
        <RuleProvider rule={rule}>
          <RuleMetadata />
        </RuleProvider>
      </I18nProvider>
    </QueryClientProvider>
  );

describe('RuleMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBulkGet.mockResolvedValue([
      { uid: ALICE_UID, user: { username: 'alice', full_name: 'Alice Example' } },
      { uid: BOB_UID, user: { username: 'bob', full_name: 'Bob Example' } },
    ]);
    mockCoreStart.mockImplementation((key: string) => key as never);
    mockUseService.mockImplementation((service: unknown) => {
      if (service === 'uiSettings') {
        return { get: () => 'MMM D, YYYY' } as never;
      }
      if (service === 'userProfile') {
        return { bulkGet: mockBulkGet } as never;
      }
      return undefined;
    });
  });

  it('renders created by and updated by users resolved from user profiles', async () => {
    renderMetadata(baseRule);
    expect(await screen.findByText('Alice Example')).toBeInTheDocument();
    expect(await screen.findByText('Bob Example')).toBeInTheDocument();
  });

  it('falls back to the username when a profile has no full name', async () => {
    mockBulkGet.mockResolvedValueOnce([
      { uid: ALICE_UID, user: { username: 'alice' } },
      { uid: BOB_UID, user: { username: 'bob' } },
    ]);
    renderMetadata(baseRule);
    expect(await screen.findByText('alice')).toBeInTheDocument();
    expect(await screen.findByText('bob')).toBeInTheDocument();
  });

  it('falls back to the UID when no matching profile is returned', async () => {
    mockBulkGet.mockResolvedValueOnce([]);
    renderMetadata(baseRule);
    expect(await screen.findByText(ALICE_UID)).toBeInTheDocument();
    expect(await screen.findByText(BOB_UID)).toBeInTheDocument();
  });

  it('renders placeholder when user fields are missing', () => {
    renderMetadata({ ...baseRule, createdBy: null, updatedBy: null });
    const placeholders = screen.getAllByText('-');
    expect(placeholders).toHaveLength(2);
  });

  it('renders formatted created and updated dates', () => {
    renderMetadata(baseRule);
    expect(screen.getByText('Mar 1, 2026')).toBeInTheDocument();
    expect(screen.getByText('Mar 4, 2026')).toBeInTheDocument();
  });
});
