/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import type { CallOutProps } from './callout';
import { CallOut } from './callout';
import { CLOSED_CASE_PUSH_ERROR_ID } from './types';
import type { AppMockRenderer } from '../../../common/mock';
import { noCasesSettingsPermission, createAppMockRenderer } from '../../../common/mock';
import userEvent from '@testing-library/user-event';

describe('Callout', () => {
  let appMockRenderer: AppMockRenderer;

  const handleButtonClick = jest.fn();
  const defaultProps: CallOutProps = {
    id: 'md5-hex',
    type: 'primary',
    messages: [
      {
        id: 'generic-error',
        title: 'message-one',
        description: <p>{'error'}</p>,
      },
    ],
    handleButtonClick,
    hasLicenseError: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  it('It renders the callout', () => {
    appMockRenderer.render(<CallOut {...defaultProps} />);
    expect(screen.getByTestId('case-callout-md5-hex')).toBeInTheDocument();
    expect(screen.getByTestId('callout-messages-md5-hex')).toBeInTheDocument();
    expect(screen.getByTestId('callout-onclick-md5-hex')).toBeInTheDocument();
  });

  it('does not shows any messages when the list is empty', () => {
    appMockRenderer.render(<CallOut {...defaultProps} messages={[]} />);
    expect(screen.queryByTestId('callout-messages-md5-hex')).not.toBeInTheDocument();
  });

  it('does not show the button when case is closed error is present', () => {
    const props = {
      ...defaultProps,
      messages: [
        {
          id: CLOSED_CASE_PUSH_ERROR_ID,
          title: 'message-one',
          description: <p>{'error'}</p>,
        },
      ],
    };

    appMockRenderer.render(<CallOut {...props} />);

    expect(screen.queryByTestId('callout-onclick-md5-hex')).not.toBeInTheDocument();
  });

  it('does not show the button when license error is present', () => {
    const props = {
      ...defaultProps,
      hasLicenseError: true,
    };

    appMockRenderer.render(<CallOut {...props} />);

    expect(screen.queryByTestId('callout-onclick-md5-hex')).not.toBeInTheDocument();
  });

  it('does not show the button with no settings permissions', () => {
    appMockRenderer = createAppMockRenderer({ permissions: noCasesSettingsPermission() });

    appMockRenderer.render(<CallOut {...defaultProps} />);

    expect(screen.queryByTestId('callout-onclick-md5-hex')).not.toBeInTheDocument();
  });

  // use this for storage if we ever want to bring that back
  it('onClick passes id and type', async () => {
    appMockRenderer.render(<CallOut {...defaultProps} />);

    expect(screen.getByTestId('callout-onclick-md5-hex')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('callout-onclick-md5-hex'));

    expect(handleButtonClick.mock.calls[0][1]).toEqual('md5-hex');
    expect(handleButtonClick.mock.calls[0][2]).toEqual('primary');
  });
});
