/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import userEvent from '@testing-library/user-event';

import { createFleetTestRendererMock } from '../../../../../../../mock';
import type { ComponentHealth } from '../../../../../types';

import { OpAMPComponentHealth } from './opamp_component_health';

describe('OpAMPComponentHealth', () => {
  const renderComponent = (health?: ComponentHealth) => {
    const renderer = createFleetTestRendererMock();
    return renderer.render(<OpAMPComponentHealth health={health} />);
  };

  it('renders overall status when health is healthy', () => {
    const component = renderComponent({
      healthy: true,
      status: 'Healthy',
      component_health_map: {
        'endpoint:default': {
          healthy: true,
          status: 'Healthy',
        },
      },
    });

    expect(component.getByText(/Collector status:/)).toBeInTheDocument();
    expect(component.getByText('Healthy')).toBeInTheDocument();
  });

  it('renders unhealthy status and errors for overall and component health', () => {
    const component = renderComponent({
      healthy: false,
      status: 'Unhealthy',
      last_error: 'Collector failure',
      component_health_map: {
        'endpoint:default': {
          healthy: false,
          status: 'Unhealthy',
          last_error: 'Unit failed',
        },
      },
    });

    expect(component.getByText('Collector failure')).toBeInTheDocument();
    expect(component.getByText('Unhealthy: Unit failed')).toBeInTheDocument();
  });

  it('renders nested component health in the components tree', async () => {
    const component = renderComponent({
      healthy: true,
      status: 'Healthy',
      component_health_map: {
        'endpoint:default': {
          healthy: true,
          status: 'Healthy',
          component_health_map: {
            'input:logs': {
              healthy: true,
              status: 'Healthy',
            },
          },
        },
      },
    });

    await userEvent.click(component.getByRole('button', { name: 'Components' }));
    expect(component.getByText('Input: logs')).toBeInTheDocument();
  });
});
