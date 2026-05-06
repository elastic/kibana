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
import type { RuleApiResponse } from '../../../services/rules_api';
import { RuleProvider } from '../rule_context';
import { RuleMetadata } from './rule_metadata';

jest.mock('@kbn/core-di-browser');

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

const baseRule: RuleApiResponse = {
  id: 'rule-1',
  kind: 'signal',
  enabled: true,
  metadata: { name: 'Test Signal Rule' },
  createdBy: 'alice@example.com',
  createdAt: '2026-03-01T12:00:00.000Z',
  updatedBy: 'bob@example.com',
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

const renderMetadata = (rule: RuleApiResponse) =>
  render(
    <I18nProvider>
      <RuleProvider rule={rule}>
        <RuleMetadata />
      </RuleProvider>
    </I18nProvider>
  );

describe('RuleMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCoreStart.mockImplementation((key: string) => key as never);
    mockUseService.mockImplementation((service: unknown) => {
      if (service === 'uiSettings') {
        return { get: () => 'MMM D, YYYY' } as never;
      }
      return undefined;
    });
  });

  it('renders created by and updated by users', () => {
    renderMetadata(baseRule);
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
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
