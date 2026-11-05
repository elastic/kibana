/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import { setLoader } from '@kbn/custom-content-renderer';
import { AgentAvatarLoader } from './agent_avatar_loader';

const renderLoader = (ui: React.ReactElement) => render(<EuiProvider>{ui}</EuiProvider>);

describe('AgentAvatarLoader', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setLoader('agentAvatar', 'orbitRing');
  });

  it('draws eight orbit-ring dots while that loader is selected', () => {
    renderLoader(<AgentAvatarLoader label="Agent is generating a response" />);

    const loader = screen.getByTestId('motionLoader');
    expect(loader).toHaveAttribute('data-loader-scenario', 'agentAvatar');
    expect(loader).toHaveAttribute('data-loader-id', 'orbitRing');
    const ring = screen.getByRole('progressbar', { name: 'Agent is generating a response' });
    expect(ring).toHaveAttribute('data-variant', 'orbit-ring');
    const circles = ring.querySelectorAll('circle');
    expect(
      Array.from(circles).map((circle) => ({
        cx: circle.getAttribute('cx'),
        cy: circle.getAttribute('cy'),
        delay: circle.style.animationDelay,
      }))
    ).toEqual([
      { cx: '12', cy: '3.25', delay: '0ms' },
      { cx: '18.187', cy: '5.813', delay: '150ms' },
      { cx: '20.75', cy: '12', delay: '300ms' },
      { cx: '18.187', cy: '18.187', delay: '450ms' },
      { cx: '12', cy: '20.75', delay: '600ms' },
      { cx: '5.813', cy: '18.187', delay: '750ms' },
      { cx: '3.25', cy: '12', delay: '900ms' },
      { cx: '5.813', cy: '5.813', delay: '1050ms' },
    ]);
  });

  it('switches to the Elastic logo when that loader is selected', () => {
    setLoader('agentAvatar', 'elastic');
    renderLoader(<AgentAvatarLoader label="Agent is generating a response" />);

    expect(screen.getByTestId('motionLoader')).toHaveAttribute('data-loader-id', 'elastic');
    expect(screen.queryByTestId('orbitRingLoader')).not.toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Agent is generating a response' })
    ).toBeInTheDocument();
  });
});
