/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithTestingProviders } from '../../../common/mock';
import { createCalloutId } from './helpers';
import type { CaseCallOutProps } from '.';
import { CaseCallOut } from '.';

describe('CaseCallOut ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps: CaseCallOutProps = {
    hasConnectors: true,
    messages: [
      { id: 'message-one', title: 'title', description: <p>{'we have two messages'}</p> },
      { id: 'message-two', title: 'title', description: <p>{'for real'}</p> },
    ],
    onEditClick: jest.fn(),
    hasLicenseError: false,
  };

  it('renders a callout correctly', () => {
    renderWithTestingProviders(<CaseCallOut {...defaultProps} />);

    const id = createCalloutId(['message-one', 'message-two']);
    expect(screen.getByTestId(`callout-messages-${id}`)).toBeInTheDocument();
  });

  it('groups the messages correctly', () => {
    const props: CaseCallOutProps = {
      ...defaultProps,
      messages: [
        {
          id: 'message-one',
          title: 'title one',
          description: <p>{'we have two messages'}</p>,
          errorType: 'danger',
        },
        { id: 'message-two', title: 'title two', description: <p>{'for real'}</p> },
      ],
    };

    renderWithTestingProviders(<CaseCallOut {...props} />);

    const idDanger = createCalloutId(['message-one']);
    const idPrimary = createCalloutId(['message-two']);

    expect(screen.getByTestId(`case-callout-${idPrimary}`)).toBeInTheDocument();
    expect(screen.getByTestId(`case-callout-${idDanger}`)).toBeInTheDocument();
  });

  it('Opens edit connectors when hasConnectors=true', async () => {
    renderWithTestingProviders(<CaseCallOut {...defaultProps} />);

    const id = createCalloutId(['message-one', 'message-two']);
    await userEvent.click(screen.getByTestId(`callout-onclick-${id}`));
    expect(defaultProps.onEditClick).toHaveBeenCalled();
  });

  it('Redirects to configure page when hasConnectors=false', async () => {
    const props = {
      ...defaultProps,
      hasConnectors: false,
    };
    renderWithTestingProviders(<CaseCallOut {...props} />);

    const id = createCalloutId(['message-one', 'message-two']);
    await userEvent.click(screen.getByTestId(`callout-onclick-${id}`));
    expect(defaultProps.onEditClick).not.toHaveBeenCalled();
  });
});
