/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AssistantNavLink } from './assistant_nav_link';
import { of } from 'rxjs';
import { useAssistantContext } from '.';

const mockShowAssistantOverlay = jest.fn();
const mockGetChromeStyle = jest.fn();

const mockAssistantContext = {
  chrome: {
    getChromeStyle$: mockGetChromeStyle,
  },
  showAssistantOverlay: mockShowAssistantOverlay,
  assistantAvailability: {
    hasAssistantPrivilege: true,
  },
};

jest.mock('.', () => {
  return {
    ...jest.requireActual('.'),
    useAssistantContext: jest.fn(),
  };
});

describe('AssistantNavLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetChromeStyle.mockReturnValue(of('classic'));
    (useAssistantContext as jest.Mock).mockReturnValue({
      ...mockAssistantContext,
    });
  });

  it('button has transparent background in project navigation', () => {
    mockGetChromeStyle.mockReturnValue(of('project'));

    const { queryByTestId } = render(
      <>
        <AssistantNavLink />
      </>
    );
    expect(queryByTestId('assistantNavLink')).not.toHaveStyle(
      'background-color: rgb(204, 228, 245)'
    );
  });

  it('button has opaque background in classic navigation', () => {
    mockGetChromeStyle.mockReturnValue(of('classic'));

    const { queryByTestId } = render(
      <>
        <AssistantNavLink />
      </>
    );
    expect(queryByTestId('assistantNavLink')).toHaveStyle('background-color: rgb(204, 228, 245)');
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
    (useAssistantContext as jest.Mock).mockReturnValue({
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
