/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { waitFor } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../mock';

import { RootPrivilegesCallout } from './root_privileges_callout';

describe('RootPrivilegesCallout', () => {
  function render(rootIntegrations?: Array<{ name: string; title: string }>) {
    const renderer = createFleetTestRendererMock();
    const results = renderer.render(<RootPrivilegesCallout rootIntegrations={rootIntegrations} />);

    return results;
  }

  it('should render callout requiring root privileges', async () => {
    const renderResult = render([{ name: 'auditd_manager', title: 'Auditd Manager' }]);

    await waitFor(() => {
      expect(renderResult.getByText('Root privileges required')).toBeInTheDocument();
      expect(renderResult.getByTestId('rootPrivilegesCallout').textContent).toContain(
        'This agent policy contains the following integrations that require Elastic Agents to have root privileges. To ensure that all data required by the integrations can be collected, enroll the agents using an account with root privileges.'
      );
      expect(renderResult.getByText('Auditd Manager')).toBeInTheDocument();
    });
  });
});
