/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { AnonymizationProfile } from '@kbn/anonymization-common';
import { TARGET_TYPE_DATA_VIEW, TARGET_TYPE_INDEX } from '../../target_types';
import { ProfilesTable } from './table/profiles_table';
import { ProfilesToolbar } from './toolbar/profiles_toolbar';

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

describe('ProfilesToolbar', () => {
  it('calls create callback when create button is clicked', () => {
    const onCreateProfile = jest.fn();
    render(
      <ProfilesToolbar
        modeLabel="Manage"
        isManageMode
        activeSpaceId="default"
        targetType=""
        onTargetTypeChange={jest.fn()}
        targetIdFilter=""
        onTargetIdFilterChange={jest.fn()}
        onCreateProfile={onCreateProfile}
      />
    );

    fireEvent.click(screen.getByText('Create profile'));
    expect(onCreateProfile).toHaveBeenCalledTimes(1);
  });
});

describe('ProfilesTable', () => {
  it('renders all provided profiles', () => {
    render(
      <ProfilesTable
        profiles={[createProfile('1', 'foo'), createProfile('2', 'bar')]}
        loading={false}
        total={2}
        page={1}
        perPage={20}
        isManageMode
        onPageChange={jest.fn()}
        onEditProfile={jest.fn()}
        onDeleteProfile={jest.fn()}
      />
    );

    expect(screen.getByText('foo')).toBeInTheDocument();
    expect(screen.getByText('bar')).toBeInTheDocument();
  });

  it('shows data view title when mapping is available', () => {
    render(
      <ProfilesTable
        profiles={[
          {
            ...createProfile('1', 'foo'),
            targetType: TARGET_TYPE_DATA_VIEW,
            targetId: 'dv-1',
          },
        ]}
        loading={false}
        total={1}
        page={1}
        perPage={20}
        isManageMode
        dataViewTitlesById={{ 'dv-1': 'logs-*' }}
        onPageChange={jest.fn()}
        onEditProfile={jest.fn()}
        onDeleteProfile={jest.fn()}
      />
    );

    expect(screen.getByText('logs-*')).toBeInTheDocument();
    expect(screen.queryByText('(dv-1)')).not.toBeInTheDocument();
  });
});
