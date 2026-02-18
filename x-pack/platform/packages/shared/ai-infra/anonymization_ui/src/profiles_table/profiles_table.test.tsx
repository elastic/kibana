/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AnonymizationProfile } from '@kbn/anonymization-common';
import { TARGET_TYPE_DATA_VIEW, TARGET_TYPE_INDEX } from '../target_types';
import { ProfilesTable } from './profiles_table';

const createProfile = (id: string, name: string): AnonymizationProfile => ({
  id,
  name,
  targetType: TARGET_TYPE_INDEX,
  targetId: `logs-${id}`,
  rules: { fieldRules: [], regexRules: [], nerRules: [] },
  saltId: 'salt-default',
  namespace: 'default',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdBy: 'elastic',
  updatedBy: 'elastic',
});

describe('ProfilesTable', () => {
  it('renders all provided profiles', () => {
    render(
      React.createElement(ProfilesTable, {
        profiles: [createProfile('1', 'foo'), createProfile('2', 'bar')],
        loading: false,
        total: 2,
        page: 1,
        perPage: 20,
        isManageMode: true,
        onPageChange: jest.fn(),
        onEditProfile: jest.fn(),
        onDeleteProfile: jest.fn(),
      })
    );

    expect(screen.getByText('foo')).toBeInTheDocument();
    expect(screen.getByText('bar')).toBeInTheDocument();
  });

  it('shows data view title when mapping is available', () => {
    render(
      React.createElement(ProfilesTable, {
        profiles: [
          {
            ...createProfile('1', 'foo'),
            targetType: TARGET_TYPE_DATA_VIEW,
            targetId: 'dv-1',
          },
        ],
        loading: false,
        total: 1,
        page: 1,
        perPage: 20,
        isManageMode: true,
        dataViewTitlesById: { 'dv-1': 'logs-*' },
        onPageChange: jest.fn(),
        onEditProfile: jest.fn(),
        onDeleteProfile: jest.fn(),
      })
    );

    expect(screen.getByText('logs-*')).toBeInTheDocument();
    expect(screen.queryByText('(dv-1)')).not.toBeInTheDocument();
  });
});
