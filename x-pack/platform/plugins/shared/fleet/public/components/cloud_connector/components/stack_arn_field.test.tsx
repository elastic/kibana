/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { StackArnField } from './stack_arn_field';

const TEST_SUBJ = 'stackArnFieldTest';
const VALID_STACK_ARN = 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/uuid';
const ERROR_TEXT = /Enter a CloudFormation stack ARN/;

describe('StackArnField', () => {
  const renderField = (props: { value?: string; onChange?: (value: string) => void } = {}) =>
    render(
      <I18nProvider>
        <StackArnField
          value={props.value ?? ''}
          onChange={props.onChange ?? jest.fn()}
          data-test-subj={TEST_SUBJ}
        />
      </I18nProvider>
    );

  it('renders the label and help text with the given test subject', () => {
    renderField();

    expect(screen.getByLabelText('CloudFormation stack ARN')).toBeInTheDocument();
    expect(screen.getByText(/Copy the StackId output/)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ)).toBeInTheDocument();
  });

  it('shows no error for an empty or valid value', () => {
    const { rerender } = renderField({ value: '' });
    expect(screen.queryByText(ERROR_TEXT)).not.toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ)).not.toBeInvalid();

    rerender(
      <I18nProvider>
        <StackArnField value={VALID_STACK_ARN} onChange={jest.fn()} data-test-subj={TEST_SUBJ} />
      </I18nProvider>
    );
    expect(screen.queryByText(ERROR_TEXT)).not.toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ)).not.toBeInvalid();
  });

  it('shows the error for a value whose region cannot be parsed', () => {
    renderField({ value: 'not-an-arn' });

    expect(screen.getByText(ERROR_TEXT)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ)).toBeInvalid();
  });

  it('forwards the raw input value to onChange without trimming', () => {
    const onChange = jest.fn();
    renderField({ onChange });

    fireEvent.change(screen.getByTestId(TEST_SUBJ), { target: { value: `  ${VALID_STACK_ARN} ` } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(`  ${VALID_STACK_ARN} `);
  });
});
