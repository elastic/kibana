/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { AttachmentGroup } from '@kbn/agent-builder-common/attachments';
import { AttachmentGroupPill } from './attachment_group_pill';

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">{ui}</IntlProvider>
    </EuiProvider>
  );

const makeGroup = (overrides: Partial<AttachmentGroup> = {}): AttachmentGroup => ({
  type: 'group',
  id: 'test-group-1',
  label: '3 Alerts',
  items: [],
  ...overrides,
});

describe('AttachmentGroupPill', () => {
  it('renders the group label', () => {
    renderWithProviders(<AttachmentGroupPill group={makeGroup({ label: '5 Alerts' })} />);

    expect(screen.getByText('5 Alerts')).toBeInTheDocument();
  });

  it('uses the group id in the data-test-subj attribute', () => {
    renderWithProviders(<AttachmentGroupPill group={makeGroup({ id: 'my-group' })} />);

    expect(screen.getByTestId('agentBuilderAttachmentGroupPill-my-group')).toBeInTheDocument();
  });

  it('does not render the remove button when onRemove is not provided', () => {
    renderWithProviders(<AttachmentGroupPill group={makeGroup()} />);

    expect(
      screen.queryByRole('button', { name: 'Remove attachment group' })
    ).not.toBeInTheDocument();
  });

  it('renders the remove button when onRemove is provided and calls it when clicked', () => {
    const onRemove = jest.fn();
    renderWithProviders(<AttachmentGroupPill group={makeGroup()} onRemove={onRemove} />);

    const removeButton = screen.getByRole('button', { name: 'Remove attachment group' });
    expect(removeButton).toBeInTheDocument();

    fireEvent.click(removeButton);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
