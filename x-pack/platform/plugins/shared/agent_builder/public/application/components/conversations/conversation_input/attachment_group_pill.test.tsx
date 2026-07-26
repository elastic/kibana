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

  it('does not render the remove button when not hovered', () => {
    renderWithProviders(<AttachmentGroupPill group={makeGroup()} onRemove={jest.fn()} />);

    expect(
      screen.queryByRole('button', { name: 'Remove attachment group' })
    ).not.toBeInTheDocument();
  });

  it('renders the remove button after hovering and calls onRemove when clicked', () => {
    const onRemove = jest.fn();
    renderWithProviders(<AttachmentGroupPill group={makeGroup()} onRemove={onRemove} />);

    const panel = screen.getByTestId('agentBuilderAttachmentGroupPill-test-group-1');
    fireEvent.mouseEnter(panel);

    const removeButton = screen.getByRole('button', { name: 'Remove attachment group' });
    expect(removeButton).toBeInTheDocument();

    fireEvent.click(removeButton);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('hides the remove button again after the mouse leaves', () => {
    renderWithProviders(<AttachmentGroupPill group={makeGroup()} onRemove={jest.fn()} />);

    const panel = screen.getByTestId('agentBuilderAttachmentGroupPill-test-group-1');
    fireEvent.mouseEnter(panel);
    expect(screen.getByRole('button', { name: 'Remove attachment group' })).toBeInTheDocument();

    fireEvent.mouseLeave(panel);
    expect(
      screen.queryByRole('button', { name: 'Remove attachment group' })
    ).not.toBeInTheDocument();
  });

  it('does not render the remove button even when hovered if onRemove is not provided', () => {
    renderWithProviders(<AttachmentGroupPill group={makeGroup()} />);

    const panel = screen.getByTestId('agentBuilderAttachmentGroupPill-test-group-1');
    fireEvent.mouseEnter(panel);

    expect(
      screen.queryByRole('button', { name: 'Remove attachment group' })
    ).not.toBeInTheDocument();
  });
});
