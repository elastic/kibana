/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from '@testing-library/react';

import { createFleetTestRendererMock } from '../mock';
import type { AgentPolicy } from '../types';

import { NewEnrollmentTokenModal } from './new_enrollment_key_modal';

jest.mock('../hooks', () => ({
  ...jest.requireActual('../hooks'),
  useStartServices: jest.fn().mockReturnValue({
    notifications: {
      toasts: {
        addSuccess: jest.fn(),
        addError: jest.fn(),
      },
    },
  }),
  sendCreateEnrollmentAPIKey: jest.fn().mockResolvedValue({ data: { item: {} } }),
}));

const MOCK_POLICIES = [
  { id: 'normal-policy', name: 'Normal Policy', revision: 1 },
  { id: 'managed-policy', name: 'Managed Policy', revision: 1, is_managed: true },
  { id: 'agentless-policy', name: 'Agentless Policy', revision: 1, supports_agentless: true },
] as AgentPolicy[];

describe('NewEnrollmentTokenModal', () => {
  it('excludes managed and agentless policies from the policy selector', async () => {
    const testRenderer = createFleetTestRendererMock();

    // Add a second normal policy so the dropdown actually shows items when opened
    const policies = [
      ...MOCK_POLICIES,
      { id: 'normal-policy-2', name: 'Normal Policy 2', revision: 1 },
    ] as AgentPolicy[];

    const results = testRenderer.render(
      <NewEnrollmentTokenModal agentPolicies={policies} onClose={jest.fn()} />
    );

    // Open the combobox dropdown to see the remaining non-selected options
    await act(async () => {
      results.getByTestId('comboBoxToggleListButton').click();
    });

    // "Normal Policy 2" should be available (Normal Policy 1 is auto-selected so not in the list)
    expect(results.getByText('Normal Policy 2')).toBeInTheDocument();
    // Managed and agentless policies should never appear
    expect(results.queryByText('Managed Policy')).toBeNull();
    expect(results.queryByText('Agentless Policy')).toBeNull();
  });

  it('renders with no options when all policies are managed or agentless', () => {
    const testRenderer = createFleetTestRendererMock();
    const policiesAllExcluded = [
      { id: 'managed-policy', name: 'Managed Policy', revision: 1, is_managed: true },
      { id: 'agentless-policy', name: 'Agentless Policy', revision: 1, supports_agentless: true },
    ] as AgentPolicy[];

    const results = testRenderer.render(
      <NewEnrollmentTokenModal agentPolicies={policiesAllExcluded} onClose={jest.fn()} />
    );

    expect(results.getByTestId('createEnrollmentTokenSelectField')).toBeInTheDocument();
    // The combobox should be empty — no pre-selected value
    expect(results.queryByText('Managed Policy')).toBeNull();
    expect(results.queryByText('Agentless Policy')).toBeNull();
  });
});
