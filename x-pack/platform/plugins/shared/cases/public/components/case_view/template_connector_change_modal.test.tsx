/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateConnectorChangeModal } from './template_connector_change_modal';

describe('TemplateConnectorChangeModal', () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('names both connectors when switching connectors', () => {
    render(
      <TemplateConnectorChangeModal
        pendingChange={{ currentConnectorName: 'My SN connector', nextConnectorName: 'My Jira' }}
        onConfirm={onConfirm}
        onCancel={onCancel}
        isApplying={false}
      />
    );

    expect(screen.getByText('Change the connector for this case?')).toBeInTheDocument();
    expect(screen.getByText(/already been pushed to My SN connector/i)).toBeInTheDocument();
    expect(screen.getByText('Change to My Jira')).toBeInTheDocument();
    expect(screen.getByText('Keep My SN connector')).toBeInTheDocument();
  });

  it('uses removal wording when the template has no connector', () => {
    render(
      <TemplateConnectorChangeModal
        pendingChange={{ currentConnectorName: 'My SN connector', nextConnectorName: null }}
        onConfirm={onConfirm}
        onCancel={onCancel}
        isApplying={false}
      />
    );

    expect(screen.getByText('Remove the connector for this case?')).toBeInTheDocument();
    expect(screen.getByText('Remove My SN connector')).toBeInTheDocument();
    expect(screen.getByText('Keep My SN connector')).toBeInTheDocument();
  });

  it('invokes onConfirm and onCancel from the buttons', async () => {
    const user = userEvent.setup();
    render(
      <TemplateConnectorChangeModal
        pendingChange={{ currentConnectorName: 'My SN connector', nextConnectorName: 'My Jira' }}
        onConfirm={onConfirm}
        onCancel={onCancel}
        isApplying={false}
      />
    );

    await user.click(screen.getByText('Change to My Jira'));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText('Keep My SN connector'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
