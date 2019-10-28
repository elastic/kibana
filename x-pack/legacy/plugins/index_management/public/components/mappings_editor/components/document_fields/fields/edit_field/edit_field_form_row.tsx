/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiText, EuiSwitch } from '@elastic/eui';

import { ToggleField, UseField, FormDataProvider } from '../../../../shared_imports';

import { ParameterName } from '../../../../types';
import { getFieldConfig } from '../../../../lib';

type ChildrenFunc = (isOn: boolean) => React.ReactNode;

interface Props {
  title?: JSX.Element;
  withToggle?: boolean;
  toggleDefaultValue?: boolean;
  direction?: 'row' | 'column';
  sizeTitle?: 's' | 'xs' | 'xxs';
  ariaId?: string;
  description?: string | JSX.Element;
  formFieldPath?: ParameterName;
  children?: React.ReactNode | ChildrenFunc;
}

const PADDING_LEFT_NO_TOGGLE = '66px';

export const EditFieldFormRow = React.memo(
  ({
    title,
    description,
    ariaId,
    withToggle = true,
    toggleDefaultValue = false,
    direction = 'row',
    sizeTitle = 'xs',
    formFieldPath,
    children,
  }: Props) => {
    const initialVisibleState =
      formFieldPath === undefined
        ? toggleDefaultValue
        : (getFieldConfig(formFieldPath).defaultValue! as boolean);

    const [isContentVisible, setIsContentVisible] = useState<boolean>(initialVisibleState);

    const isChildrenFunction = typeof children === 'function';

    const onToggle = () => {
      setIsContentVisible(!isContentVisible);
    };

    const renderToggleInput = () =>
      formFieldPath === undefined ? (
        <EuiSwitch checked={isContentVisible} onChange={onToggle} data-test-subj="input" />
      ) : (
        <UseField
          path={formFieldPath}
          component={ToggleField}
          config={getFieldConfig(formFieldPath)}
        />
      );

    const renderContent = () => (
      <EuiFlexGroup className="mappings-editor__edit-field__formRow">
        {withToggle && (
          <EuiFlexItem grow={false} className="mappingsEditor__editFieldFormRow__toggle">
            {renderToggleInput()}
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiFlexGroup direction={direction} gutterSize="s">
            {(title || description) && (
              <EuiFlexItem
                style={{
                  paddingLeft: withToggle === false ? PADDING_LEFT_NO_TOGGLE : undefined,
                }}
              >
                {title && (
                  <EuiTitle
                    id={`${ariaId}-title`}
                    size={sizeTitle}
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
            {(isContentVisible || isChildrenFunction) && (
              <EuiFlexItem
                style={{
                  paddingLeft: withToggle === false ? PADDING_LEFT_NO_TOGGLE : undefined,
                }}
              >
                {isChildrenFunction ? (children as ChildrenFunc)(isContentVisible) : children}
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    return formFieldPath ? (
      <FormDataProvider pathsToWatch={formFieldPath}>
        {formData => {
          setIsContentVisible(formData[formFieldPath]);
          return renderContent();
        }}
      </FormDataProvider>
    ) : (
      renderContent()
    );
  }
);
