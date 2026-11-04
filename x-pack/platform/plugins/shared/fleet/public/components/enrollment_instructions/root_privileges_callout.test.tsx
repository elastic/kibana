/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { RootPrivilegesCallout } from './root_privileges_callout';

jest.mock('../../hooks', () => ({
  useStartServices: () => ({
    docLinks: {
      links: { fleet: { unprivilegedMode: 'https://elastic.co/docs/unprivileged-mode' } },
    },
  }),
}));

describe('RootPrivilegesCallout', () => {
  function render(rootIntegrations?: Array<{ name: string; title: string }>) {
    return renderWithI18n(<RootPrivilegesCallout rootIntegrations={rootIntegrations} />);
  }

  it('should render callout requiring root privileges', () => {
    render([{ name: 'auditd_manager', title: 'Auditd Manager' }]);

    expect(screen.getByText('Root privileges required')).toBeInTheDocument();
    expect(screen.getByTestId('rootPrivilegesCallout').textContent).toContain(
      'This agent policy contains the following integrations that require Elastic Agents to have root privileges. To ensure that all data required by the integrations can be collected, enroll the agents using an account with root privileges.'
    );
    expect(screen.getByText('Auditd Manager')).toBeInTheDocument();
  });
});
