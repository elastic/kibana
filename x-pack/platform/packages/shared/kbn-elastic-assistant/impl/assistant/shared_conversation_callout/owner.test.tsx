/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SharedConversationOwnerCallout } from './owner';
import { TestProviders } from '../../mock/test_providers/test_providers';
import * as i18n from './translations';

const testProps = {
  id: 'test-convo-id',
  isGloballyShared: true,
};

describe('SharedConversationOwnerCallout', () => {
  beforeEach(() => {
    // Clear localStorage before each test to ensure isolation
    window.localStorage.clear();
  });

  it('renders globally shared callout with correct title and description', () => {
    render(<SharedConversationOwnerCallout {...testProps} />);
    expect(screen.getByText(i18n.CONVERSATION_SHARED_TITLE)).toBeInTheDocument();
    expect(screen.getByText(i18n.OWNERSHIP_CALLOUT)).toBeInTheDocument();
    expect(screen.getByTestId('ownerSharedConversationCallout')).toBeInTheDocument();
  });

  it('renders restricted callout with correct title and description', () => {
    render(<SharedConversationOwnerCallout {...testProps} isGloballyShared={false} />);
    expect(screen.getByText(i18n.CONVERSATION_RESTRICTED_TITLE)).toBeInTheDocument();
    expect(screen.getByText(i18n.OWNERSHIP_CALLOUT_RESTRICTED)).toBeInTheDocument();
    expect(screen.getByTestId('ownerSharedConversationCallout')).toBeInTheDocument();
  });

  it('hides the callout when dismissed', () => {
    render(<SharedConversationOwnerCallout {...testProps} />);
    expect(screen.getByTestId('ownerSharedConversationCallout')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('euiDismissCalloutButton'));
    expect(screen.queryByTestId('ownerSharedConversationCallout')).not.toBeInTheDocument();
  });

  it('persists dismissed state in localStorage', () => {
    render(<SharedConversationOwnerCallout {...testProps} />);
    fireEvent.click(screen.getByTestId('euiDismissCalloutButton'));
    // Re-render should not show the callout
    render(<SharedConversationOwnerCallout {...testProps} />);
    expect(screen.queryByTestId('ownerSharedConversationCallout')).not.toBeInTheDocument();
  });

  it('shows the callout again if localStorage is reset', () => {
    render(<SharedConversationOwnerCallout {...testProps} />);
    fireEvent.click(screen.getByTestId('euiDismissCalloutButton'));
    window.localStorage.clear();
    render(
      <TestProviders>
        <SharedConversationOwnerCallout {...testProps} />
      </TestProviders>
    );
    expect(screen.getByTestId('ownerSharedConversationCallout')).toBeInTheDocument();
  });
});
