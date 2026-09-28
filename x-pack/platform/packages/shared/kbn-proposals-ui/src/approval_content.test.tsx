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
  comment: 'Isolate the compromised host.',
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

/** DOM order, so the bitmask is spelled out once rather than at every call site. */
const isBefore = (first: Element, second: Element) =>
  // eslint-disable-next-line no-bitwise
  Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('ApprovalContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the header when showHeader is true (default)', () => {
    renderContent();
    expect(screen.getByText('Needs review')).toBeInTheDocument();
  });

  it('hides the header when showHeader is false', () => {
    renderContent({ showHeader: false });
    expect(screen.queryByText('Needs review')).not.toBeInTheDocument();
  });

  it('renders a caption under the badge when supplied', () => {
    renderContent({ caption: 'Rule tuning · Reversible' });
    expect(screen.getByText('Rule tuning · Reversible')).toBeInTheDocument();
  });

  it('omits the caption line when none is supplied', () => {
    renderContent({ caption: undefined });
    expect(screen.queryByText('Rule tuning · Reversible')).not.toBeInTheDocument();
  });

  it('renders the comment', () => {
    renderContent();
    expect(screen.getByText('Isolate the compromised host.')).toBeInTheDocument();
  });

  it('renders emphasis in the comment as markdown rather than literal asterisks', () => {
    renderContent({ comment: 'Revoking **all** sessions.' });
    expect(screen.getByText('all').tagName).toBe('STRONG');
  });

  it('renders a GFM table in the comment, which is how a proposal lists what it touches', () => {
    const { container } = renderContent({
      comment: ['| Field | Value |', '| --- | --- |', '| host | fin-dc-01 |'].join('\n'),
    });

    expect(container.querySelector('table')).toBeInTheDocument();
    expect(screen.getByText('fin-dc-01')).toBeInTheDocument();
  });

  it('omits the comment block entirely when no comment is supplied', () => {
    renderContent({ comment: undefined });
    expect(screen.queryByTestId('approvalContent-comment')).not.toBeInTheDocument();
  });

  it('renders the secondary action before the primary, so the committing decision sits last', () => {
    renderContent();
    expect(
      isBefore(screen.getByTestId('content-cancel'), screen.getByTestId('content-confirm'))
    ).toBe(true);
  });

  it('renders the icon a secondary action asks for', () => {
    renderContent({
      secondaryActions: [
        { label: 'Dismiss', iconType: 'cross', onClick: jest.fn(), 'data-test-subj': 'content-x' },
      ],
    });
    expect(screen.getByTestId('content-x').querySelector('[data-euiicon-type]')).toBeTruthy();
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
    expect(isBefore(screen.getByTestId('inline-form'), screen.getByTestId('content-confirm'))).toBe(
      true
    );
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
