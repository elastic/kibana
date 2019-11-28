/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFormRow, EuiTextArea, EuiTextAreaProps } from '@elastic/eui';
import { CommonProps } from '@elastic/eui/src/components/common';
// @ts-ignore
import { FormsyInputProps, withFormsy } from 'formsy-react';
import React, { Component, InputHTMLAttributes } from 'react';

interface ComponentProps extends FormsyInputProps, CommonProps, EuiTextAreaProps {
  instantValidation: boolean;
  label: string;
  errorText: string;
  fullWidth: boolean;
  helpText: React.ReactElement<any>;
  compressed: boolean;
  onChange(e: React.ChangeEvent<HTMLTextAreaElement>, value: any): void;
  onBlur(e: React.ChangeEvent<HTMLTextAreaElement>, value: any): void;
}

interface ComponentState {
  allowError: boolean;
}

class MultiFieldText extends Component<
  InputHTMLAttributes<HTMLTextAreaElement> & ComponentProps,
  ComponentState
> {
  public static defaultProps = {
    passRequiredToField: true,
  };

  public state = { allowError: false };

  public componentDidMount() {
    const { defaultValue, setValue } = this.props;

    if (defaultValue) {
      setValue(defaultValue);
    }
  }

  public UNSAFE_componentWillReceiveProps(nextProps: ComponentProps) {
    if (nextProps.isFormSubmitted()) {
      this.showError();
    }
  }

  public handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.currentTarget.value.split('\n');
    this.props.setValue(value);
    if (this.props.onChange) {
      this.props.onChange(e, value);
    }
    if (this.props.instantValidation) {
      this.showError();
    }
  };

  public handleBlur = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.showError();
    if (this.props.onBlur) {
      this.props.onBlur(e, e.currentTarget.value);
    }
  };

  public showError = () => this.setState({ allowError: true });

  public render() {
    const {
      id,
      required,
      label,
      getValue,
      isValid,
      isPristine,
      getErrorMessage,
      fullWidth,
      className,
      disabled,
      helpText,
      placeholder,
    } = this.props;

    const { allowError } = this.state;
    const error = !isPristine() && !isValid() && allowError;

    return (
      <EuiFormRow
        id={id}
        label={label}
        helpText={helpText}
        isInvalid={!disabled && error}
        error={!disabled && error ? getErrorMessage() : []}
      >
        <EuiTextArea
          id={id}
          name={name}
          value={getValue() ? getValue().join('\n') : ''}
          isInvalid={!disabled && error}
          placeholder={placeholder}
          onChange={this.handleChange}
          onBlur={this.handleBlur}
          fullWidth={fullWidth}
          disabled={disabled}
          required={required}
          className={className}
        />
      </EuiFormRow>
    );
  }
}

export const FormsyEuiMultiFieldText = withFormsy(MultiFieldText);
