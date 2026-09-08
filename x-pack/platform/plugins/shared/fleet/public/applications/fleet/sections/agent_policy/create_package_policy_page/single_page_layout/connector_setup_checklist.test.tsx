/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1";
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import type { ConnectorChecklistItem } from '../../../../../../../common/services';
import { ConnectorSetupChecklist } from './connector_setup_checklist';

const renderChecklist = (items: ConnectorChecklistItem[]) =>
  render(
    <I18nProvider>
      <ConnectorSetupChecklist items={items} />
    </I18nProvider>
  );

const item = (overrides: Partial<ConnectorChecklistItem> = {}): ConnectorChecklistItem => ({
  name: 'github_connector_id',
  title: 'GitHub connector',
  required: true,
  configured: false,
  ...overrides,
});

describe('FLEET-013 · ConnectorSetupChecklist', () => {
  it('renders nothing when there are no connector vars', () => {
    const { container } = renderChecklist([]);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists each connector by title', () => {
    renderChecklist([
      item(),
      item({ name: 'slack_connector', title: 'Slack connector', required: false }),
    ]);

    expect(screen.getByText('GitHub connector')).toBeInTheDocument();
    expect(screen.getByText('Slack connector')).toBeInTheDocument();
  });

  it('marks a configured connector as done and a pending one as outstanding', () => {
    renderChecklist([
      item({ configured: true }),
      item({ name: 'slack_connector', title: 'Slack', configured: false }),
    ]);

    expect(screen.getByTestId('connectorChecklistConfigured-github_connector_id')).toBeInTheDocument();
    expect(screen.getByTestId('connectorChecklistPending-slack_connector')).toBeInTheDocument();
  });

  it('warns while a required connector is unconfigured', () => {
    renderChecklist([item({ configured: false })]);

    expect(screen.getByTestId('connectorSetupIncomplete')).toBeInTheDocument();
    expect(screen.queryByTestId('connectorSetupComplete')).not.toBeInTheDocument();
  });

  it('confirms once every required connector is configured', () => {
    renderChecklist([
      item({ configured: true }),
      item({ name: 'slack_connector', title: 'Slack', required: false, configured: false }),
    ]);

    expect(screen.getByTestId('connectorSetupComplete')).toBeInTheDocument();
    expect(screen.queryByTestId('connectorSetupIncomplete')).not.toBeInTheDocument();
  });

  it('badges required connectors only', () => {
    renderChecklist([
      item(),
      item({ name: 'slack_connector', title: 'Slack', required: false }),
    ]);

    expect(screen.getAllByText('Required')).toHaveLength(1);
  });

  it('states that no Elastic Agent is required', () => {
    renderChecklist([item()]);

    expect(screen.getByText(/no Elastic Agent is required/i)).toBeInTheDocument();
  });

  it('shows a connector description when the manifest provides one', () => {
    renderChecklist([item({ description: 'Connector ID for the GitHub inference connector' })]);

    expect(
      screen.getByText('Connector ID for the GitHub inference connector')
    ).toBeInTheDocument();
  });
});
