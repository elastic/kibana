/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../../mock';
import type { AgentPolicy } from '../../../../../types';

import { SettingsView } from '.';

const renderSettings = (agentPolicy: Partial<AgentPolicy>) =>
  createFleetTestRendererMock().render(
    <SettingsView
      agentPolicy={
        {
          id: 'policy-1',
          name: 'Test policy',
          namespace: 'default',
          revision: 1,
          is_managed: false,
          package_policies: [],
          updated_at: new Date().toISOString(),
          ...agentPolicy,
        } as AgentPolicy
      }
    />
  );

describe('SettingsView', () => {
  it('lets the user edit a regular policy and shows the save button after a change', () => {
    const { getByTestId } = renderSettings({ supports_agentless: false });

    const nameField = getByTestId('createAgentPolicyNameField');
    expect(nameField).toBeEnabled();

    fireEvent.change(nameField, { target: { value: 'Renamed policy' } });

    expect(getByTestId('agentPolicyDetailsSaveButton')).toBeEnabled();
  });

  it('makes the settings of an agentless policy read-only and keeps the save button disabled', () => {
    const { getByTestId } = renderSettings({ supports_agentless: true });

    const nameField = getByTestId('createAgentPolicyNameField');
    expect(nameField).toBeDisabled();

    // even if a change gets through, the policy can't be saved
    fireEvent.change(nameField, { target: { value: 'Renamed policy' } });

    expect(getByTestId('agentPolicyDetailsSaveButton')).toBeDisabled();
  });
});
