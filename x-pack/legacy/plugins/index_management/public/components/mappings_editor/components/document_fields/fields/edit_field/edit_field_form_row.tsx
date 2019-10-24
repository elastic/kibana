/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiFormRow,
  EuiSwitch,
  EuiDescribedFormGroup,
} from '@elastic/eui';

import { ToggleField, UseField, FieldHook, FieldConfig } from '../../../../shared_imports';

import { PARAMETERS_DEFINITION } from '../../../../constants';
import { ParameterName } from '../../../../types';

interface Props {
  title?: JSX.Element;
  withToggle?: boolean;
  direction?: 'row' | 'column';
  ariaId?: string;
  description?: string | JSX.Element;
  formFieldPath?: ParameterName;
  children?: React.ReactNode;
}

const PADDING_LEFT_NO_TOGGLE = '66px';

const getFieldConfig = (param: ParameterName): FieldConfig =>
  PARAMETERS_DEFINITION[param].fieldConfig || {};

export const EditFieldFormRow = ({
  title,
  description,
  ariaId,
  withToggle = true,
  direction = 'row',
  formFieldPath,
  children,
}: Props) => {
  const initialVisibleState =
    formFieldPath === undefined
      ? !Boolean(withToggle)
      : (getFieldConfig(formFieldPath).defaultValue! as boolean);

  const [isContentVisible, setIsContentVisible] = useState<boolean>(initialVisibleState);

  const onToggle = () => {
    setIsContentVisible(!isContentVisible);
  };

  const onFormToggleChange = (field: FieldHook) => (e: any) => {
    // We both set the form field value + set the isContentVisible
    const isSelected = e.target.checked;

    field.setValue(isSelected);
    setIsContentVisible(isSelected);
  };

  const renderToggleInput = () =>
    formFieldPath === undefined ? (
      <EuiSwitch checked={isContentVisible} onChange={onToggle} data-test-subj="input" />
    ) : (
      <UseField path={formFieldPath} component={ToggleField} config={getFieldConfig(formFieldPath)}>
        {field => (
          <ToggleField field={field} euiFieldProps={{ onChange: onFormToggleChange(field) }} />
        )}
      </UseField>
    );

  return (
    <EuiFlexGroup className="mappings-editor__edit-field__formRow">
      {withToggle && (
        <EuiFlexItem grow={false} className="mappingsEditor__editFieldFormRow__toggle">
          {renderToggleInput()}
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiFlexGroup direction={direction}>
          {(title || description) && (
            <EuiFlexItem
              style={{
                paddingLeft: withToggle === false ? PADDING_LEFT_NO_TOGGLE : undefined,
              }}
            >
              {title && (
                <EuiTitle
                  id={`${ariaId}-title`}
                  size="s"
                  className="mappings-editor__edit-field__formRow__title"
                >
                  {title}
                </EuiTitle>
              )}
              {description && (
                <EuiText id={ariaId} size="s" color="subdued">
                  {description}
                </EuiText>
              )}
            </EuiFlexItem>
          )}
          {isContentVisible && (
            <EuiFlexItem
              style={{
                paddingLeft: withToggle === false ? PADDING_LEFT_NO_TOGGLE : undefined,
              }}
            >
              {children}
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
