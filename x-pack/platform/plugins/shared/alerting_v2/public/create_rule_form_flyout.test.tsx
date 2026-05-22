/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { RuleFormServices } from '@kbn/alerting-v2-rule-form';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { applicationServiceMock } from '@kbn/core/public/mocks';
import { lensPluginMock } from '@kbn/lens-plugin/public/mocks';

const createMockServices = (): RuleFormServices => ({
  http: httpServiceMock.createStartContract(),
  data: dataPluginMock.createStartContract(),
  dataViews: dataViewPluginMocks.createStartContract(),
  notifications: notificationServiceMock.createStartContract(),
  application: applicationServiceMock.createStartContract(),
  lens: lensPluginMock.createStartContract(),
});

// Capture props passed to the underlying DynamicRuleFormFlyout from the package
let capturedFlyoutProps: Record<string, unknown> = {};
jest.mock('@kbn/alerting-v2-rule-form', () => ({
  DynamicRuleFormFlyout: (props: Record<string, unknown>) => {
    capturedFlyoutProps = props;
    return <div data-test-subj="mockDynamicRuleFormFlyout" />;
  },
}));

// Control when services resolve in tests
let resolveServices: (services: RuleFormServices) => void;
jest.mock('./kibana_services', () => ({
  untilPluginStartServicesReady: () =>
    new Promise<RuleFormServices>((resolve) => {
      resolveServices = resolve;
    }),
}));

import { DynamicRuleFormFlyout } from './create_rule_form_flyout';

describe('DynamicRuleFormFlyout', () => {
  beforeEach(() => {
    capturedFlyoutProps = {};
  });

  it('shows a loading spinner while services are resolving', () => {
    render(<DynamicRuleFormFlyout query="FROM logs-*" onClose={jest.fn()} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('mockDynamicRuleFormFlyout')).not.toBeInTheDocument();
  });

  it('renders the flyout once services are resolved', async () => {
    const mockServices = createMockServices();
    render(<DynamicRuleFormFlyout query="FROM logs-*" onClose={jest.fn()} />);

    // Resolve the services promise
    resolveServices(mockServices);

    await waitFor(() => {
      expect(screen.getByTestId('mockDynamicRuleFormFlyout')).toBeInTheDocument();
    });
  });

  it('passes query and onClose props to the underlying flyout', async () => {
    const mockServices = createMockServices();
    const onClose = jest.fn();

    render(<DynamicRuleFormFlyout query="FROM metrics-* | LIMIT 10" onClose={onClose} />);

    resolveServices(mockServices);

    await waitFor(() => {
      expect(screen.getByTestId('mockDynamicRuleFormFlyout')).toBeInTheDocument();
    });

    expect(capturedFlyoutProps.query).toBe('FROM metrics-* | LIMIT 10');
    expect(capturedFlyoutProps.onClose).toBe(onClose);
  });

  it('passes services from the plugin to the underlying flyout', async () => {
    const mockServices = createMockServices();

    render(<DynamicRuleFormFlyout query="FROM logs-*" />);

    resolveServices(mockServices);

    await waitFor(() => {
      expect(screen.getByTestId('mockDynamicRuleFormFlyout')).toBeInTheDocument();
    });

    expect(capturedFlyoutProps.services).toBe(mockServices);
  });

  it('passes push prop to the underlying flyout', async () => {
    const mockServices = createMockServices();

    render(<DynamicRuleFormFlyout query="FROM logs-*" push />);

    resolveServices(mockServices);

    await waitFor(() => {
      expect(screen.getByTestId('mockDynamicRuleFormFlyout')).toBeInTheDocument();
    });

    expect(capturedFlyoutProps.push).toBe(true);
  });

  it('defaults includeYaml to true', async () => {
    const mockServices = createMockServices();

    render(<DynamicRuleFormFlyout query="FROM logs-*" />);

    resolveServices(mockServices);

    await waitFor(() => {
      expect(screen.getByTestId('mockDynamicRuleFormFlyout')).toBeInTheDocument();
    });

    expect(capturedFlyoutProps.includeYaml).toBe(true);
  });

  it('forwards includeYaml=false when explicitly set', async () => {
    const mockServices = createMockServices();

    render(<DynamicRuleFormFlyout query="FROM logs-*" includeYaml={false} />);

    resolveServices(mockServices);

    await waitFor(() => {
      expect(screen.getByTestId('mockDynamicRuleFormFlyout')).toBeInTheDocument();
    });

    expect(capturedFlyoutProps.includeYaml).toBe(false);
  });
});
