/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createFleetTestRendererMock } from '../../../../../mock';
import type { AgentPolicy } from '../../../types';

import { AgentPolicyForm } from './agent_policy_form';

const renderForm = (agentPolicy: Partial<AgentPolicy>) => {
  const renderer = createFleetTestRendererMock();
  return renderer.render(
    <AgentPolicyForm
      agentPolicy={{ name: 'Test policy', namespace: 'default', ...agentPolicy }}
      updateAgentPolicy={jest.fn()}
      withSysMonitoring={false}
      updateSysMonitoring={jest.fn()}
      validation={{}}
      isEditing={true}
      updateAdvancedSettingsHasErrors={jest.fn()}
      setInvalidSpaceError={jest.fn()}
    />
  );
};

describe('AgentPolicyForm', () => {
  it('keeps the general and advanced fields editable for a regular policy', () => {
    const { getByTestId } = renderForm({ supports_agentless: false });

    expect(getByTestId('createAgentPolicyNameField')).toBeEnabled();
    expect(getByTestId('defaultNamespaceInput')).not.toHaveClass('euiComboBox-isDisabled');
    expect(getByTestId('collectLogsCheckbox')).toBeEnabled();
  });

  it('makes the general and advanced fields read-only for an agentless policy', () => {
    const { getByTestId } = renderForm({ supports_agentless: true });

    expect(getByTestId('createAgentPolicyNameField')).toBeDisabled();
    expect(getByTestId('defaultNamespaceInput')).toHaveClass('euiComboBox-isDisabled');
    expect(getByTestId('collectLogsCheckbox')).toBeDisabled();
  });
});
