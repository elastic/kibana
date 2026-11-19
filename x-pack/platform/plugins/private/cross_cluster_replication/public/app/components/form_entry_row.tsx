/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent, Fragment, type ReactElement, type ReactNode } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFieldText,
  EuiFormRow,
  EuiLink,
} from '@elastic/eui';

/**
 * State transitions: fields update
 */
export const updateFields =
  <T extends Record<string, string | number>>(newValues: Partial<T>) =>
  ({ fields }: { fields: T }) => ({
    fields: {
      ...fields,
      ...newValues,
    },
  });

interface StructuredError {
  message?: ReactNode;
  alwaysVisible?: boolean;
}

type FormEntryError = ReactElement[] | StructuredError | undefined | null;

const isStructuredError = (error: FormEntryError | string | undefined): error is StructuredError =>
  !!error && typeof error === 'object' && !Array.isArray(error);

interface Props {
  /** EuiDescribedFormGroup expects a React element for the title slot. */
  title: ReactElement;
  description?: ReactNode;
  label?: ReactNode;
  helpText?: ReactNode;
  type?: string;
  onValueUpdate: (value: string | number) => void;
  field: string;
  value: string | number | undefined;
  defaultValue?: string | number;
  isLoading?: boolean;
  error?: FormEntryError | string;
  disabled?: boolean;
  areErrorsVisible: boolean;
  testSubj?: string;
}

export class FormEntryRow extends PureComponent<Props> {
  onFieldChange = (value: string | number) => {
    const { onValueUpdate, type } = this.props;
    const isNumber = type === 'number';

    let valueParsed = value;

    if (isNumber) {
      valueParsed = !!value ? Math.max(0, parseInt(String(value), 10)) : value; // make sure we don't send NaN value or a negative number
    }

    onValueUpdate(valueParsed);
  };

  renderField = (isInvalid: boolean) => {
    const { value, type, disabled, isLoading, testSubj } = this.props;
    switch (type) {
      case 'number':
        return (
          <EuiFieldNumber
            isInvalid={isInvalid}
            value={value}
            onChange={(e) => this.onFieldChange(e.target.value)}
            disabled={disabled === true}
            isLoading={isLoading}
            fullWidth
            data-test-subj={testSubj}
          />
        );
      default:
        return (
          <EuiFieldText
            isInvalid={isInvalid}
            value={value}
            onChange={(e) => this.onFieldChange(e.target.value)}
            disabled={disabled === true}
            isLoading={isLoading}
            fullWidth
            data-test-subj={testSubj}
          />
        );
    }
  };

  render() {
    const {
      field,
      error,
      title,
      label,
      description,
      helpText,
      areErrorsVisible,
      value,
      defaultValue,
    } = this.props;

    const structured = isStructuredError(error) ? error : undefined;
    const isInvalid = !!error && ((structured && structured.alwaysVisible) || areErrorsVisible);
    const canBeResetToDefault = defaultValue !== undefined;
    const isResetToDefaultVisible = value !== defaultValue;

    const fieldHelpText = (
      <Fragment>
        {helpText}

        {canBeResetToDefault && isResetToDefaultVisible && (
          <p>
            <EuiLink onClick={() => this.onFieldChange(defaultValue)}>
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexForm.resetFieldButtonLabel"
                defaultMessage="Reset to default"
              />
            </EuiLink>
          </p>
        )}
      </Fragment>
    );

    return (
      <EuiDescribedFormGroup title={title} description={description} fullWidth key={field}>
        <EuiFormRow
          label={label}
          helpText={fieldHelpText}
          error={isStructuredError(error) ? error.message : error}
          isInvalid={isInvalid}
          fullWidth
        >
          {this.renderField(isInvalid)}
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }
}
