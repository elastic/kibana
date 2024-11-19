/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AttackDiscoveryStatusIndicator } from './attack_discovery_status_indicator';
import { render } from '@testing-library/react';

describe('AttackDiscoveryStatusIndicator', () => {
  it('renders loading spinner when status is running and hasViewed is false', () => {
    const { getByTestId } = render(
      <AttackDiscoveryStatusIndicator hasViewed={false} status={'running'} count={0} />
    );

    expect(getByTestId('status-running')).toBeInTheDocument();
  });
  it('renders loading spinner when status is running and hasViewed is true', () => {
    const { getByTestId } = render(
      <AttackDiscoveryStatusIndicator hasViewed={true} status={'running'} count={0} />
    );

    expect(getByTestId('status-running')).toBeInTheDocument();
  });

  it('renders null when status is not running hasViewed is true', () => {
    const { queryByTestId } = render(
      <AttackDiscoveryStatusIndicator hasViewed={true} status={'succeeded'} count={5} />
    );

    expect(queryByTestId('status-succeeded')).not.toBeInTheDocument();
  });

  it('renders succeeded count badge when status is succeeded and count is not null', () => {
    const { getByTestId } = render(
      <AttackDiscoveryStatusIndicator hasViewed={false} status={'succeeded'} count={0} />
    );

    expect(getByTestId('status-succeeded')).toBeInTheDocument();
  });

  it('renders failed badge when status is failed', () => {
    const { getByTestId } = render(
      <AttackDiscoveryStatusIndicator hasViewed={false} status={'failed'} count={0} />
    );

    expect(getByTestId('status-failed')).toBeInTheDocument();
  });

  it('renders null when status is canceled', () => {
    const { queryByTestId } = render(
      <AttackDiscoveryStatusIndicator hasViewed={false} status={'canceled'} count={0} />
    );

    expect(queryByTestId('status-running')).not.toBeInTheDocument();
    expect(queryByTestId('status-succeeded')).not.toBeInTheDocument();
    expect(queryByTestId('status-failed')).not.toBeInTheDocument();
  });
});
