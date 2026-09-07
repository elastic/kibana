/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProfilesToolbar } from './profiles_toolbar';

describe('ProfilesToolbar', () => {
  it('calls create callback when create button is clicked', () => {
    const onCreateProfile = jest.fn();

    render(
      React.createElement(ProfilesToolbar, {
        modeLabel: 'Manage',
        isManageMode: true,
        activeSpaceId: 'default',
        targetType: '',
        onTargetTypeChange: jest.fn(),
        targetIdFilter: '',
        onTargetIdFilterChange: jest.fn(),
        onCreateProfile,
      })
    );

    fireEvent.click(screen.getByText('Create profile'));

    expect(onCreateProfile).toHaveBeenCalledTimes(1);
  });

  it('shows combined name or target id filter placeholder', () => {
    render(
      React.createElement(ProfilesToolbar, {
        modeLabel: 'Manage',
        isManageMode: true,
        activeSpaceId: 'default',
        targetType: '',
        onTargetTypeChange: jest.fn(),
        targetIdFilter: '',
        onTargetIdFilterChange: jest.fn(),
        onCreateProfile: jest.fn(),
      })
    );

    expect(screen.getByPlaceholderText('Filter by name or target id')).toBeInTheDocument();
  });
});
