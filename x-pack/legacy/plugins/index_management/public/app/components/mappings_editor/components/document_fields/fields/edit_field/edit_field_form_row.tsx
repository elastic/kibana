/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiText, EuiSwitch, EuiSpacer } from '@elastic/eui';

import {
  ToggleField,
  UseField,
  FormDataProvider,
  FieldHook,
  useFormContext,
} from '../../../../shared_imports';

import { ParameterName } from '../../../../types';
import { getFieldConfig } from '../../../../lib';

type ChildrenFunc = (isOn: boolean) => React.ReactNode;

interface Props {
  title: JSX.Element;
  withToggle?: boolean;
  toggleDefaultValue?: boolean;
  sizeTitle?: 's' | 'xs' | 'xxs';
  ariaId?: string;
  description?: string | JSX.Element;
  formFieldPath?: ParameterName;
  children?: React.ReactNode | ChildrenFunc;
}

export const EditFieldFormRow = React.memo(
  ({
    title,
    description,
    withToggle = true,
    toggleDefaultValue,
    sizeTitle = 'xs',
    formFieldPath,
    ariaId = formFieldPath,
    children,
  }: Props) => {
    const form = useFormContext();
    const toggleField = useRef<FieldHook | undefined>(undefined);
    const switchLabel = title.props.children;

    const initialVisibleState =
      withToggle === false
        ? true
        : toggleDefaultValue !== undefined
        ? toggleDefaultValue
        : formFieldPath !== undefined
        ? (getFieldConfig(formFieldPath).defaultValue! as boolean)
        : false;

    const [isContentVisible, setIsContentVisible] = useState<boolean>(initialVisibleState);

    const isChildrenFunction = typeof children === 'function';

    const onToggle = () => {
      if (isContentVisible === true) {
        /**
         * We are hiding the children (and thus removing any form field from the DOM).
         * We need to reset the form to re-enable a possible disabled "save" button (from a previous validation error).
         */
        form.reset({ resetValues: false });
      }
      setIsContentVisible(!isContentVisible);
    };

    const onClickTitle = () => {
      if (toggleField.current) {
        toggleField.current.setValue(!toggleField.current.value);
      } else {
        onToggle();
      }
    };

    const renderToggleInput = () =>
      formFieldPath === undefined ? (
        <EuiSwitch
          label={switchLabel}
          checked={isContentVisible}
          onChange={onToggle}
          data-test-subj="input"
          showLabel={false}
        />
      ) : (
        <UseField
          path={formFieldPath}
          config={{ ...getFieldConfig(formFieldPath), defaultValue: initialVisibleState }}
        >
          {field => {
            toggleField.current = field;
            return (
              <ToggleField field={field} euiFieldProps={{ label: switchLabel, showLabel: false }} />
            );
          }}
        </UseField>
      );

    const renderContent = () => {
      const toggle = withToggle && (
        <EuiFlexItem grow={false} className="mappingsEditor__editFieldFormRow__toggle">
          {renderToggleInput()}
        </EuiFlexItem>
      );

      const controlsTitle = title && (
        <button
          onClick={onClickTitle}
          type="button"
          className="mappingsEditor__editField__formRow__btnTitle"
        >
          <EuiTitle
            id={`${ariaId}-title`}
            size={sizeTitle}
            className="mappingsEditor__editField__formRow__title"
          >
            {title}
          </EuiTitle>
        </button>
      );

      const controlsDescription = description && (
        <EuiText id={ariaId} size="s" color="subdued">
          {description}
        </EuiText>
      );

      const controlsHeader = (controlsTitle || controlsDescription) && (
        <div
          style={{
            paddingLeft: withToggle === false ? '0' : undefined,
          }}
        >
          {controlsTitle}
          {controlsDescription}
        </div>
      );

      const controls = ((isContentVisible && children !== undefined) || isChildrenFunction) && (
        <div
          style={{
            paddingLeft: withToggle === false ? '0' : undefined,
          }}
        >
          <EuiSpacer size="m" />
          {isChildrenFunction ? (children as ChildrenFunc)(isContentVisible) : children}
        </div>
      );

      return (
        <EuiFlexGroup className="mappingsEditor__editField__formRow">
          {toggle}

          <EuiFlexItem>
            <div>
              {controlsHeader}
              {controls}
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    };

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
