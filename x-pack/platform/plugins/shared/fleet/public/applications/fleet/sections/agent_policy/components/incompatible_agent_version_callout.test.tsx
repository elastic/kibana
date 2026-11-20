/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../mock';

import { IncompatibleAgentVersionCallout } from './incompatible_agent_version_callout';

describe('IncompatibleAgentVersionCallout', () => {
  const render = (props: Partial<React.ComponentProps<typeof IncompatibleAgentVersionCallout>>) =>
    createFleetTestRendererMock().render(
      <IncompatibleAgentVersionCallout
        incompatibility="SOME"
        versionCondition="^9.4.0"
        blockedCount={2}
        observedVersions={['9.3.1']}
        {...props}
      />
    );

  it('explains the impact on the incompatible agents', () => {
    const { getByTestId } = render({ minVersion: '9.4.0' });

    const callout = getByTestId('incompatibleAgentVersionCallout');
    expect(callout).toHaveTextContent(
      "2 active agents on 9.3.1 would stop collecting this integration's data."
    );
    expect(callout).toHaveTextContent(
      'Upgrade them first to a version that satisfies the condition, such as 9.4.0.'
    );
  });

  it('words the warning for a single agent policy', () => {
    const { getByTestId } = render({ agentPolicyCount: 1 });

    expect(getByTestId('incompatibleAgentVersionCallout')).toHaveTextContent(
      'Some agents using the selected agent policy are running'
    );
  });

  it('words the warning for several agent policies', () => {
    const { getByTestId } = render({ incompatibility: 'ALL', agentPolicyCount: 2 });

    expect(getByTestId('incompatibleAgentVersionCallout')).toHaveTextContent(
      'None of the agents using the selected agent policies are compatible'
    );
  });

  it('does not suggest an upgrade target without a minimum version', () => {
    const { getByTestId } = render({});

    expect(getByTestId('incompatibleAgentVersionCallout')).not.toHaveTextContent('Upgrade them');
  });

  it('does not ask for an acknowledgement unless the change requires one', () => {
    const { queryByTestId } = render({});

    expect(queryByTestId('acknowledgeAgentVersionIncompatibilityCheckbox')).toBeNull();
  });

  it('reports the acknowledgement', () => {
    const onAcknowledgeChange = jest.fn();
    const { getByTestId } = render({ onAcknowledgeChange, acknowledged: false });

    fireEvent.click(getByTestId('acknowledgeAgentVersionIncompatibilityCheckbox'));

    expect(onAcknowledgeChange).toHaveBeenCalledWith(true);
  });
});
