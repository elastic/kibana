/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { AssistantNavLink } from './assistant_nav_link';
import { useAssistantContext } from '.';

const mockShowAssistantOverlay = vi.fn();

const mockAssistantContext = {
  showAssistantOverlay: mockShowAssistantOverlay,
  assistantAvailability: {
    hasAssistantPrivilege: true,
  },
  isOverlayOpen: false,
};

vi.mock('.', async () => {
  return {
    ...(await vi.importActual('.')),
    useAssistantContext: vi.fn(),
  };
});

describe('AssistantNavLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAssistantContext as Mock).mockReturnValue({
      ...mockAssistantContext,
    });
  });

  it('should render the header link text', () => {
    const { queryByText, queryByTestId } = render(
      <>
        <AssistantNavLink />
      </>
    );
    expect(queryByTestId('assistantNavLink')).toBeInTheDocument();
    expect(queryByText('AI Assistant')).toBeInTheDocument();
  });

  it('should not render the header link if not authorized', () => {
    (useAssistantContext as Mock).mockReturnValue({
      ...mockAssistantContext,
      assistantAvailability: {
        hasAssistantPrivilege: false,
      },
    });

    const { queryByText, queryByTestId } = render(
      <>
        <AssistantNavLink />
      </>
    );
    expect(queryByTestId('assistantNavLink')).not.toBeInTheDocument();
    expect(queryByText('AI Assistant')).not.toBeInTheDocument();
  });

  it('should call the assistant overlay to show on click', () => {
    const { queryByTestId } = render(
      <>
        <AssistantNavLink />
      </>
    );
    queryByTestId('assistantNavLink')?.click();
    expect(mockShowAssistantOverlay).toHaveBeenCalledTimes(1);
    expect(mockShowAssistantOverlay).toHaveBeenCalledWith({ showOverlay: true });
  });
});
