/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AcknowledgeActionButton } from './acknowledge_action_button';

describe('AcknowledgeActionButton', () => {
  it('renders Unacknowledge when lastAckAction is undefined (treated as acknowledged)', () => {
    render(<AcknowledgeActionButton />);
    expect(screen.getByTestId('alertEpisodeAcknowledgeActionButton')).toHaveTextContent(
      'Acknowledge'
    );
    expect(
      screen
        .getByTestId('alertEpisodeAcknowledgeActionButton')
        .querySelector('[data-euiicon-type="checkCircle"]')
    ).toBeInTheDocument();
  });

  it('renders Unacknowledge when lastAckAction is ack', () => {
    render(<AcknowledgeActionButton lastAckAction="ack" />);
    expect(screen.getByTestId('alertEpisodeAcknowledgeActionButton')).toHaveTextContent(
      'Unacknowledge'
    );
    expect(
      screen
        .getByTestId('alertEpisodeAcknowledgeActionButton')
        .querySelector('[data-euiicon-type="crossCircle"]')
    ).toBeInTheDocument();
  });

  it('renders Acknowledge when lastAckAction is unack', () => {
    render(<AcknowledgeActionButton lastAckAction="unack" />);
    expect(screen.getByTestId('alertEpisodeAcknowledgeActionButton')).toHaveTextContent(
      'Acknowledge'
    );
    expect(
      screen
        .getByTestId('alertEpisodeAcknowledgeActionButton')
        .querySelector('[data-euiicon-type="checkCircle"]')
    ).toBeInTheDocument();
  });
});
