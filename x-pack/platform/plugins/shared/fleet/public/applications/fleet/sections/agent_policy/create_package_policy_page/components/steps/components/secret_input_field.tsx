/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useRef } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiText,
  EuiPanel,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiLink,
  EuiIconTip,
} from '@elastic/eui';

import { useStartServices } from '../../../../../../../../hooks';

import type { InputComponentProps } from './types';

export interface SecretInputFieldProps extends InputComponentProps {
  value: any;
  onChange: (newValue: any) => void;
  getInputComponent: (inputComponentProps: InputComponentProps) => React.JSX.Element;
}

export interface SecretInputFieldPropsNew extends InputComponentProps {
  getInputComponent: (inputComponentProps: InputComponentProps) => React.JSX.Element;
}

/**
 * SecretFieldWrapper is a wrapper component that provides a panel explaining the use of secrets
 * in package policies. It includes a link to the documentation for more information.
 * This component is publicly exported to be used in other plugins
 */
export const SecretFieldWrapper = ({ children }: { children: React.ReactNode }) => {
  const { docLinks } = useStartServices();

  return (
    <EuiPanel hasShadow={false} color="subdued" paddingSize="m">
      {children}

      <EuiSpacer size="l" />

      <EuiText size="xs">
        <EuiLink href={docLinks.links.fleet.policySecrets} target="_blank">
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.stepConfigure.secretLearnMoreText"
            defaultMessage="Learn more about policy secrets."
          />
        </EuiLink>
      </EuiText>
    </EuiPanel>
  );
};

/**
 * SecretFieldLabel provides a label for a secret field
 * This component is publicly exported to be used in other plugins
 */
export const SecretFieldLabel = ({ fieldLabel }: { fieldLabel: string }) => {
  return (
    <>
      <EuiFlexGroup alignItems="flexEnd" gutterSize="xs">
        <EuiFlexItem grow={false} aria-label={fieldLabel}>
          {fieldLabel}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type="info"
            position="top"
            content={
              <FormattedMessage
                id="xpack.fleet.createPackagePolicy.stepConfigure.secretLearnMorePopoverContent"
                defaultMessage="This value is a secret. After you save this integration policy, you won't be able to view the value again."
              />
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
    </>
  );
};

/**
 * SecretInputField renders an input field for a secret variable in a package policy.
 * This component is publicly exported to be used in other plugins
 */
export function SecretInputField({
  varDef,
  value,
  onChange,
  frozen,
  packageName,
  packageType,
  datastreams = [],
  isEditPage,
  isInvalid,
  fieldLabel,
  fieldTestSelector,
  setIsDirty,
  isDirty,
  getInputComponent,
}: SecretInputFieldProps) {
  const [isReplacing, setIsReplacing] = useState(isEditPage && !value);
  const valueOnFirstRender = useRef(value);

  const hasExistingValue = !!valueOnFirstRender.current;
  const lowercaseTitle = varDef.title?.toLowerCase();
  const showInactiveReplaceUi = isEditPage && !isReplacing && hasExistingValue;
  const valueIsSecretRef = value && value?.isSecretRef;

  const inputComponent = getInputComponent({
    varDef,
    value: isReplacing && valueIsSecretRef ? '' : value,
    onChange,
    frozen,
    packageName,
    packageType,
    datastreams,
    isEditPage,
    isInvalid,
    fieldLabel,
    fieldTestSelector,
    isDirty,
    setIsDirty,
  });

  // If there's no value for this secret, display the input as its "brand new" creation state
  // instead of the "replace" state
  if (!hasExistingValue) {
    return inputComponent;
  }

  if (showInactiveReplaceUi) {
    return (
      <>
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.fleet.editPackagePolicy.stepConfigure.fieldSecretValueSet"
            defaultMessage="The saved {varName} is hidden. You can only replace the {varName}."
            values={{
              varName: lowercaseTitle,
            }}
          />
        </EuiText>
        <EuiSpacer size="s" />
        <EuiButtonEmpty
          onClick={() => setIsReplacing(true)}
          color="primary"
          iconType="refresh"
          iconSide="left"
          size="xs"
          data-test-subj={`button-replace-${fieldTestSelector}`}
        >
          <FormattedMessage
            id="xpack.fleet.editPackagePolicy.stepConfigure.fieldSecretValueSetEditButton"
            defaultMessage="Replace {varName}"
            values={{
              varName: lowercaseTitle,
            }}
          />
        </EuiButtonEmpty>
      </>
    );
  }

  if (isReplacing) {
    const cancelButton = (
      <EuiButtonEmpty
        onClick={() => {
          setIsReplacing(false);
          setIsDirty(false);
          onChange(valueOnFirstRender.current);
        }}
        color="primary"
        iconType="refresh"
        iconSide="left"
        size="xs"
      >
        <FormattedMessage
          id="xpack.fleet.editPackagePolicy.stepConfigure.fieldSecretValueSetCancelButton"
          defaultMessage="Cancel {varName} change"
          values={{
            varName: lowercaseTitle,
          }}
        />
      </EuiButtonEmpty>
    );
    return (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
        <EuiFlexItem grow={false} style={{ width: '100%' }}>
          {inputComponent}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{cancelButton}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return inputComponent;
}
