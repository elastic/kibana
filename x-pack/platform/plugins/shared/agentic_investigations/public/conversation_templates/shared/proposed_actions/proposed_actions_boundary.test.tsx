/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProposedActionsCountBoundary } from './proposed_actions_boundary';

const Throws = (): React.ReactElement => {
  throw new Error('boom');
};

const NeverResolves = React.lazy(() => new Promise<never>(() => {}));

describe('ProposedActionsCountBoundary', () => {
  it('renders its children', () => {
    render(
      <ProposedActionsCountBoundary>
        <span>count</span>
      </ProposedActionsCountBoundary>
    );

    expect(screen.getByText('count')).toBeInTheDocument();
  });

  it('renders nothing when a child throws', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const { container } = render(
      <ProposedActionsCountBoundary>
        <Throws />
      </ProposedActionsCountBoundary>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while a lazy child is loading', () => {
    const { container } = render(
      <ProposedActionsCountBoundary>
        <NeverResolves />
      </ProposedActionsCountBoundary>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
