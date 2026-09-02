/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import type { Agent, AgentPolicy } from '../../../types';

import { MetricNonAvailable } from './metric_non_available';

jest.mock('@elastic/eui', () => {
  return {
    ...jest.requireActual('@elastic/eui'),
    // Render the tooltip content inline so we can assert on the message
    EuiIconTip: (props: any) => <div data-test-subj="iconTipContent">{props.content}</div>,
  };
});

const renderComponent = ({
  monitoringEnabled,
  agentStatus,
}: {
  monitoringEnabled?: boolean;
  agentStatus?: Agent['status'];
}) => {
  const agentPolicy =
    monitoringEnabled === undefined
      ? undefined
      : ({
          monitoring_enabled: monitoringEnabled ? ['metrics'] : [],
        } as unknown as AgentPolicy);
  const agent =
    agentStatus === undefined ? undefined : ({ status: agentStatus } as unknown as Agent);

  return render(
    <I18nProvider>
      <MetricNonAvailable agentPolicy={agentPolicy} agent={agent} />
    </I18nProvider>
  );
};

describe('MetricNonAvailable', () => {
  it('should show the monitoring-not-enabled message when metrics monitoring is disabled', () => {
    const result = renderComponent({ monitoringEnabled: false, agentStatus: 'online' });

    expect(result.getByText(/Agent monitoring is not enabled for this agent policy/)).toBeTruthy();
  });

  it('should show the offline message when the agent is offline and monitoring is enabled', () => {
    const result = renderComponent({ monitoringEnabled: true, agentStatus: 'offline' });

    expect(
      result.getByText(/This agent is offline, so metrics are not currently available/)
    ).toBeTruthy();
  });

  it('should prioritize the monitoring-not-enabled message over the offline one', () => {
    const result = renderComponent({ monitoringEnabled: false, agentStatus: 'offline' });

    expect(result.getByText(/Agent monitoring is not enabled for this agent policy/)).toBeTruthy();
    expect(result.queryByText(/This agent is offline/)).toBeNull();
  });

  it('should show the generic fallback message when monitoring is enabled and the agent is not offline', () => {
    const result = renderComponent({ monitoringEnabled: true, agentStatus: 'online' });

    expect(result.getByText(/That metric is not available/)).toBeTruthy();
  });

  it('should show the generic fallback message when no agent is passed and monitoring is enabled', () => {
    const result = renderComponent({ monitoringEnabled: true });

    expect(result.getByText(/That metric is not available/)).toBeTruthy();
  });
});
