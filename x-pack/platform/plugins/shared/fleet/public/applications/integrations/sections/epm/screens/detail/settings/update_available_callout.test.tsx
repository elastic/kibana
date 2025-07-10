/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { type BreakingChangesLog, ChangeType } from '../utils';

import { UpdateAvailableCallout } from './update_available_callout';

const renderWithIntlProvider = (children: React.ReactNode) =>
  render(<IntlProvider>{children}</IntlProvider>);

describe('UpdateAvailableCallout', () => {
  const mockToggleChangelogModal = jest.fn();
  const mockBreakingChangesToggleIsUnderstood = jest.fn();
  const mockBreakingChangesOnOpen = jest.fn();

  const breakingChangesBaseMock = {
    changelog: [],
    isUnderstood: false,
    toggleIsUnderstood: mockBreakingChangesToggleIsUnderstood,
    onOpen: mockBreakingChangesOnOpen,
  };

  const multipleBreakingChangesMock: BreakingChangesLog = [
    {
      changes: [
        {
          type: ChangeType.BreakingChange,
          link: 'https://example.com/pr/1234',
          description: 'Breaking change 1',
        },
        {
          type: ChangeType.BreakingChange,
          link: 'https://example.com/pr/1235',
          description: 'Breaking change 2',
        },
      ],
      version: '1.2.3',
    },
  ];

  const singleBreakingChangesMock: BreakingChangesLog = [
    {
      changes: [
        {
          type: ChangeType.BreakingChange,
          link: 'https://example.com/pr/1234',
          description: 'Breaking change 1',
        },
      ],
      version: '1.2.3',
    },
  ];

  it('renders the callout with default title and body when no breaking changes exist', () => {
    renderWithIntlProvider(
      <UpdateAvailableCallout
        version="1.2.3"
        toggleChangelogModal={mockToggleChangelogModal}
        breakingChanges={null}
      />
    );

    expect(screen.getByText('New version available')).toBeInTheDocument();
    expect(
      screen.getByText('Upgrade to version 1.2.3 to get the latest features.')
    ).toBeInTheDocument();
    expect(screen.getByText('View changelog')).toBeInTheDocument();
  });

  it('renders the callout with breaking changes title and body when breaking changes exist', () => {
    renderWithIntlProvider(
      <UpdateAvailableCallout
        version="1.2.3"
        toggleChangelogModal={mockToggleChangelogModal}
        breakingChanges={{ ...breakingChangesBaseMock, changelog: multipleBreakingChangesMock }}
      />
    );

    expect(
      screen.getByText('New version available: Action required due to breaking changes')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Version 1.2.3 includes new features and breaking changes that may affect your current setup. Please review the changes carefully before upgrading.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("I've reviewed the breaking changes and understand the impact.")
    ).toBeInTheDocument();
  });

  it('calls toggleChangelogModal when "View changelog" button is clicked', () => {
    renderWithIntlProvider(
      <UpdateAvailableCallout
        version="1.2.3"
        toggleChangelogModal={mockToggleChangelogModal}
        breakingChanges={{ ...breakingChangesBaseMock, changelog: multipleBreakingChangesMock }}
      />
    );

    fireEvent.click(screen.getByText('View changelog'));
    expect(mockToggleChangelogModal).toHaveBeenCalledTimes(1);
  });

  it('renders the breaking changes button with a link when there is one change', () => {
    renderWithIntlProvider(
      <UpdateAvailableCallout
        version="1.2.3"
        toggleChangelogModal={mockToggleChangelogModal}
        breakingChanges={{
          ...breakingChangesBaseMock,
          changelog: singleBreakingChangesMock,
        }}
      />
    );

    const breakingChangesButton = screen.getByText('Review breaking changes');
    expect(breakingChangesButton).toBeInTheDocument();
    expect(breakingChangesButton.closest('a')).toHaveAttribute(
      'href',
      'https://example.com/pr/1234'
    );
  });

  it('renders the breaking changes button that calls breakingChanges.onOpen when there are multiple changes', () => {
    renderWithIntlProvider(
      <UpdateAvailableCallout
        version="1.2.3"
        toggleChangelogModal={mockToggleChangelogModal}
        breakingChanges={{
          ...breakingChangesBaseMock,
          changelog: multipleBreakingChangesMock,
        }}
      />
    );

    const breakingChangesButton = screen.getByText('Review breaking changes');
    expect(breakingChangesButton).toBeInTheDocument();
    fireEvent.click(breakingChangesButton);
    expect(mockBreakingChangesOnOpen).toHaveBeenCalledTimes(1);
  });

  it('calls toggleIsUnderstood when the checkbox is clicked', () => {
    renderWithIntlProvider(
      <UpdateAvailableCallout
        version="1.2.3"
        toggleChangelogModal={mockToggleChangelogModal}
        breakingChanges={{ ...breakingChangesBaseMock, changelog: multipleBreakingChangesMock }}
      />
    );

    const checkbox = screen.getByLabelText(
      "I've reviewed the breaking changes and understand the impact."
    );
    fireEvent.click(checkbox);
    expect(mockBreakingChangesToggleIsUnderstood).toHaveBeenCalledTimes(1);
  });
});
