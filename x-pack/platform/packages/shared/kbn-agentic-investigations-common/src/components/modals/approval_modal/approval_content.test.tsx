/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { ApprovalContent, type ApprovalContentProps } from './approval_content';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiProvider>{children}</EuiProvider>
);

const baseProps: ApprovalContentProps = {
  title: 'Block IP 10.0.0.4',
  tone: 'danger',
  iconType: 'lock',
  blastRadius: { variant: 'description', description: 'Isolate the compromised host.' },
  primaryAction: {
    label: 'Approve',
    onClick: jest.fn(),
    'data-test-subj': 'content-confirm',
  },
  secondaryActions: [
    {
      label: 'Cancel',
      onClick: jest.fn(),
      'data-test-subj': 'content-cancel',
    },
  ],
  'data-test-subj': 'approvalContent',
};

const renderContent = (props: Partial<ApprovalContentProps> = {}) =>
  render(<ApprovalContent {...baseProps} {...props} />, { wrapper });

describe('ApprovalContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the header when showHeader is true (default)', () => {
    renderContent();
    expect(screen.getByText(/approval required/i)).toBeInTheDocument();
  });

  it('hides the header when showHeader is false', () => {
    renderContent({ showHeader: false });
    expect(screen.queryByText(/approval required/i)).not.toBeInTheDocument();
  });

  it('renders the blast radius section label', () => {
    renderContent();
    expect(screen.getByText('Blast radius')).toBeInTheDocument();
  });

  it('renders the description variant prose', () => {
    renderContent();
    expect(screen.getByText('Isolate the compromised host.')).toBeInTheDocument();
  });

  it('renders list variant items', () => {
    renderContent({
      blastRadius: {
        variant: 'list',
        items: [
          { id: 'item-1', iconType: 'globe', text: 'host: 10.0.0.4' },
          { id: 'item-2', iconType: 'tag', text: 'network' },
        ],
      },
    });
    expect(screen.getByText('host: 10.0.0.4')).toBeInTheDocument();
    expect(screen.getByText('network')).toBeInTheDocument();
  });

  it('renders the actor row by default', () => {
    renderContent();
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText(/Senior Analyst/)).toBeInTheDocument();
  });

  it('hides the actor row when showActorRow is false', () => {
    renderContent({ showActorRow: false });
    expect(screen.queryByText('You')).not.toBeInTheDocument();
  });

  it('renders the primary action button', () => {
    renderContent();
    expect(screen.getByTestId('content-confirm')).toHaveTextContent('Approve');
  });

  it('renders secondary action buttons as empty buttons', () => {
    renderContent();
    expect(screen.getByTestId('content-cancel')).toHaveTextContent('Cancel');
  });

  it('calls primaryAction.onClick when primary button is clicked', () => {
    const onClick = jest.fn();
    renderContent({
      primaryAction: { label: 'Approve', onClick, 'data-test-subj': 'content-confirm' },
    });
    fireEvent.click(screen.getByTestId('content-confirm'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls secondaryAction.onClick when secondary button is clicked', () => {
    const onClick = jest.fn();
    renderContent({
      secondaryActions: [{ label: 'Cancel', onClick, 'data-test-subj': 'content-cancel' }],
    });
    fireEvent.click(screen.getByTestId('content-cancel'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('omits the footer when neither primaryAction nor secondaryActions are supplied', () => {
    renderContent({ primaryAction: undefined, secondaryActions: undefined });
    expect(screen.queryByTestId('content-confirm')).not.toBeInTheDocument();
    expect(screen.queryByTestId('content-cancel')).not.toBeInTheDocument();
  });

  it('renders children between the body and the footer', () => {
    renderContent({ children: <div data-test-subj="inline-form">dismiss form</div> });
    const form = screen.getByTestId('inline-form');
    const confirm = screen.getByTestId('content-confirm');
    // children should appear before the confirm button in DOM order
    // eslint-disable-next-line no-bitwise
    expect(form.compareDocumentPosition(confirm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders always-allow checkbox when alwaysAllow is supplied', () => {
    renderContent({
      alwaysAllow: {
        id: 'always-allow',
        label: 'Always allow',
        checked: false,
        onChange: jest.fn(),
      },
    });
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('does not render always-allow checkbox when alwaysAllow is omitted', () => {
    renderContent({ alwaysAllow: undefined });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('calls alwaysAllow.onChange when checkbox is toggled', () => {
    const onChange = jest.fn();
    renderContent({
      alwaysAllow: {
        id: 'always-allow',
        label: 'Always allow',
        checked: false,
        onChange,
      },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
