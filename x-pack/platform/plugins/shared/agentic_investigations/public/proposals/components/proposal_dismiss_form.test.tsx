/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ProposalDismissForm } from './proposal_dismiss_form';
import type { ProposalDismissFormProps } from './proposal_dismiss_form';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: () => ({ euiTheme: { size: { m: '16px' } } }),
}));

const defaultProps: ProposalDismissFormProps = {
  dismissReason: 'wrong',
  rationale: '',
  onDismissReasonChange: jest.fn(),
  onRationaleChange: jest.fn(),
};

describe('ProposalDismissForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<ProposalDismissForm {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders the data-test-subj on the wrapper when provided', () => {
    const { container } = render(
      <ProposalDismissForm {...defaultProps} data-test-subj="my-dismiss-form" />
    );
    expect(container.querySelector('[data-test-subj="my-dismiss-form"]')).toBeInTheDocument();
  });

  it('renders reason select with the data-test-subj suffix "-reason"', () => {
    const { container } = render(
      <ProposalDismissForm {...defaultProps} data-test-subj="dismiss-form" />
    );
    expect(container.querySelector('[data-test-subj="dismiss-form-reason"]')).toBeInTheDocument();
  });

  it('renders rationale textarea with the data-test-subj suffix "-rationale"', () => {
    const { container } = render(
      <ProposalDismissForm {...defaultProps} data-test-subj="dismiss-form" />
    );
    expect(
      container.querySelector('[data-test-subj="dismiss-form-rationale"]')
    ).toBeInTheDocument();
  });

  it('calls onDismissReasonChange with the new value when the select changes', () => {
    const onDismissReasonChange = jest.fn();
    const { container } = render(
      <ProposalDismissForm
        {...defaultProps}
        onDismissReasonChange={onDismissReasonChange}
        data-test-subj="dismiss-form"
      />
    );
    const select = container.querySelector(
      '[data-test-subj="dismiss-form-reason"]'
    ) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'duplicate' } });
    expect(onDismissReasonChange).toHaveBeenCalledWith('duplicate');
  });

  it('calls onRationaleChange with the new value when the textarea changes', () => {
    const onRationaleChange = jest.fn();
    const { container } = render(
      <ProposalDismissForm
        {...defaultProps}
        onRationaleChange={onRationaleChange}
        data-test-subj="dismiss-form"
      />
    );
    const textarea = container.querySelector(
      '[data-test-subj="dismiss-form-rationale"]'
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Not relevant to this incident' } });
    expect(onRationaleChange).toHaveBeenCalledWith('Not relevant to this incident');
  });

  it('displays the current rationale value in the textarea', () => {
    const { container } = render(
      <ProposalDismissForm
        {...defaultProps}
        rationale="Already mitigated"
        data-test-subj="dismiss-form"
      />
    );
    const textarea = container.querySelector(
      '[data-test-subj="dismiss-form-rationale"]'
    ) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Already mitigated');
  });

  it('does not apply data-test-subj to inner elements when the prop is omitted', () => {
    const { container } = render(<ProposalDismissForm {...defaultProps} />);
    expect(container.querySelector('[data-test-subj$="-reason"]')).toBeNull();
    expect(container.querySelector('[data-test-subj$="-rationale"]')).toBeNull();
  });

  it('does not mark the rationale row invalid before the field is touched', () => {
    const { container } = render(
      <ProposalDismissForm {...defaultProps} rationale="" data-test-subj="dismiss-form" />
    );
    const textarea = container.querySelector(
      '[data-test-subj="dismiss-form-rationale"]'
    ) as HTMLTextAreaElement;
    expect(textarea).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('marks the rationale row invalid when rationale is empty after blur', () => {
    const { container } = render(
      <ProposalDismissForm {...defaultProps} rationale="" data-test-subj="dismiss-form" />
    );
    const textarea = container.querySelector(
      '[data-test-subj="dismiss-form-rationale"]'
    ) as HTMLTextAreaElement;
    fireEvent.blur(textarea);
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
  });

  it('marks the rationale row invalid when rationale is whitespace-only after blur', () => {
    const { container } = render(
      <ProposalDismissForm {...defaultProps} rationale="   " data-test-subj="dismiss-form" />
    );
    const textarea = container.querySelector(
      '[data-test-subj="dismiss-form-rationale"]'
    ) as HTMLTextAreaElement;
    fireEvent.blur(textarea);
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not mark the rationale row invalid when rationale has content', () => {
    const { container } = render(
      <ProposalDismissForm
        {...defaultProps}
        rationale="Already mitigated"
        data-test-subj="dismiss-form"
      />
    );
    const textarea = container.querySelector(
      '[data-test-subj="dismiss-form-rationale"]'
    ) as HTMLTextAreaElement;
    fireEvent.blur(textarea);
    expect(textarea).not.toHaveAttribute('aria-invalid', 'true');
  });
});
