/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertEpisodesAssigneeFilter } from './assignee_filter';
import * as inlineFilterPopoverModule from './inline_filter_popover';
import * as useBulkGetProfilesModule from '../../hooks/use_bulk_get_profiles';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      userProfile: {},
      notifications: { toasts: { addError: jest.fn() } },
    },
  }),
}));

jest.mock('../../hooks/use_bulk_get_profiles', () => ({
  useBulkGetProfiles: jest.fn(),
}));

const mockUseBulkGetProfiles = jest.mocked(useBulkGetProfilesModule.useBulkGetProfiles);
const InlineFilterPopoverSpy = jest.spyOn(inlineFilterPopoverModule, 'InlineFilterPopover');

mockUseBulkGetProfiles.mockReturnValue({
  data: [
    {
      uid: 'uid-alice',
      user: { full_name: 'Alice Smith', email: 'alice@example.com', username: 'alice' },
    },
    { uid: 'uid-bob', user: { full_name: '', email: 'bob@example.com', username: 'bob' } },
    { uid: 'uid-charlie', user: { full_name: '', email: '', username: 'charlie' } },
  ],
  isLoading: false,
} as unknown as ReturnType<typeof useBulkGetProfilesModule.useBulkGetProfiles>);

describe('AlertEpisodesAssigneeFilter', () => {
  const defaultProps = {
    selectedAssigneeUid: undefined,
    onAssigneeChange: jest.fn(),
    assigneeUids: ['uid-alice', 'uid-bob', 'uid-charlie'],
    'data-test-subj': 'test-assignee-filter',
  };

  const user = userEvent.setup({ delay: null });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const openPopover = () => user.click(screen.getByTestId('test-assignee-filter-button'));

  it('renders button as expected', () => {
    render(<AlertEpisodesAssigneeFilter {...defaultProps} />);
    expect(screen.getByText('Assignee')).toBeInTheDocument();
    expect(screen.getByTestId('test-assignee-filter-button')).toHaveTextContent('3');
    expect(screen.getByTestId('test-assignee-filter-button')).not.toHaveClass(
      'euiFilterButton-hasActiveFilters'
    );
  });

  it('shows hasActiveFilters when an assignee is selected', () => {
    render(<AlertEpisodesAssigneeFilter {...defaultProps} selectedAssigneeUid="uid-alice" />);
    expect(screen.getByTestId('test-assignee-filter-button')).toHaveClass(
      'euiFilterButton-hasActiveFilters'
    );
  });

  it('maps profiles to options using full_name, then email, then username', async () => {
    render(<AlertEpisodesAssigneeFilter {...defaultProps} />);
    await openPopover();
    expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [
          { label: 'Alice Smith', value: 'uid-alice' },
          { label: 'bob@example.com', value: 'uid-bob' },
          { label: 'charlie', value: 'uid-charlie' },
        ],
      }),
      {}
    );
  });

  it('calls onAssigneeChange with uid when a value is selected', async () => {
    const onAssigneeChange = jest.fn();
    render(<AlertEpisodesAssigneeFilter {...defaultProps} onAssigneeChange={onAssigneeChange} />);
    await openPopover();

    const props = InlineFilterPopoverSpy.mock.calls[0][0];
    act(() => {
      props.onSelectionChange(['uid-alice']);
    });

    expect(onAssigneeChange).toHaveBeenCalledWith('uid-alice');
  });

  it('calls onAssigneeChange with undefined when selection is cleared', async () => {
    const onAssigneeChange = jest.fn();
    render(<AlertEpisodesAssigneeFilter {...defaultProps} onAssigneeChange={onAssigneeChange} />);
    await openPopover();

    const props = InlineFilterPopoverSpy.mock.calls[0][0];
    act(() => {
      props.onSelectionChange([]);
    });

    expect(onAssigneeChange).toHaveBeenCalledWith(undefined);
  });

  it('filters options by label when search is provided', async () => {
    render(<AlertEpisodesAssigneeFilter {...defaultProps} />);
    await openPopover();

    const props = InlineFilterPopoverSpy.mock.calls[0][0];
    act(() => {
      props.onSearchChange!('alice');
    });

    expect(InlineFilterPopoverSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        options: [{ label: 'Alice Smith', value: 'uid-alice' }],
      }),
      {}
    );
  });
});
