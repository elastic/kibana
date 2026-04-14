/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  type EuiFormRowProps,
  EuiIcon,
  EuiIconTip,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import {
  SSL_SECRETS_MINIMUM_FLEET_SERVER_VERSION,
  OUTPUT_SECRETS_MINIMUM_FLEET_SERVER_VERSION,
  DOWNLOAD_SOURCE_AUTH_SECRETS_MINIMUM_FLEET_SERVER_VERSION,
} from '../../../../../../../common/constants';

export type SecretType = 'output' | 'ssl' | 'download_source_auth';

export const SecretFormRow: React.FC<{
  fullWidth?: boolean;
  children: EuiFormRowProps['children'];
  useSecretsStorage: boolean;
  isConvertedToSecret?: boolean;
  onToggleSecretStorage?: (secretEnabled: boolean) => void;
  error?: string[];
  isInvalid?: boolean;
  title?: string;
  clear?: () => void;
  initialValue?: any;
  cancelEdit?: () => void;
  label?: JSX.Element;
  disabled?: boolean;
  secretType?: SecretType;
}> = ({
  fullWidth,
  error,
  isInvalid,
  children,
  clear,
  title,
  initialValue,
  onToggleSecretStorage,
  cancelEdit,
  useSecretsStorage,
  isConvertedToSecret = false,
  label,
  disabled,
  secretType = 'output',
}) => {
  const minVersion =
    secretType === 'output'
      ? OUTPUT_SECRETS_MINIMUM_FLEET_SERVER_VERSION
      : secretType === 'download_source_auth'
      ? DOWNLOAD_SOURCE_AUTH_SECRETS_MINIMUM_FLEET_SERVER_VERSION
      : SSL_SECRETS_MINIMUM_FLEET_SERVER_VERSION;
  const hasInitialValue = !!initialValue;
  const [editMode, setEditMode] = useState(isConvertedToSecret || !initialValue);
  const valueHiddenPanel = (
    <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
      {disabled ? (
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.fleet.outputForm.secretValueHiddenAndDisabledMessage"
            defaultMessage="The saved {varName} is hidden."
            values={{
              varName: title,
            }}
          />
        </EuiText>
      ) : (
        <>
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.fleet.outputForm.secretValueHiddenMessage"
              defaultMessage="The saved {varName} is hidden. You can only replace the {varName}."
              values={{
                varName: title,
              }}
            />
          </EuiText>
          <EuiSpacer size="s" />
          <EuiButtonEmpty
            onClick={() => {
              setEditMode(true);
              if (clear) {
                clear();
              }
            }}
            color="primary"
            iconType="refresh"
            iconSide="left"
            size="xs"
          >
            <FormattedMessage
              id="xpack.fleet.outputForm.editSecretValue"
              defaultMessage="Replace {varName}"
              values={{
                varName: title,
              }}
            />
          </EuiButtonEmpty>
        </>
      )}
    </EuiPanel>
  );

  const cancelButton = (
    <EuiButtonEmpty
      onClick={() => {
        setEditMode(false);
        if (cancelEdit) cancelEdit();
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
          varName: title,
        }}
      />
    </EuiButtonEmpty>
  );

  const editValue = (
    <>
      {children}
      {hasInitialValue && !isConvertedToSecret && (
        <EuiFlexGroup justifyContent="flexEnd" data-test-subj="secretCancelChangeBtn">
          <EuiFlexItem grow={false}>{cancelButton}</EuiFlexItem>
        </EuiFlexGroup>
      )}
    </>
  );

  const secretLabel = (
    <>
      <EuiIcon type="lock" data-test-subj="lockIcon" />
      &nbsp;
      {title}
      &nbsp;
      <EuiIconTip
        content={i18n.translate('xpack.fleet.settings.editOutputFlyout.sslKeySecretInputTooltip', {
          defaultMessage:
            'This value will be stored as a secret, meaning once saved the value cannot be viewed again',
        })}
        type="question"
      />
    </>
  );

  const helpText = useMemo(() => {
    if (disabled) return null;
    if (isConvertedToSecret)
      return (
        <EuiCallOut announceOnMount size="s" color="warning">
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.sslKeySecretInputConvertedCalloutTitle"
            defaultMessage="This field will be re-saved using secret storage from plain text storage. Secrets storage requires Fleet Server v{minVersion} and above."
            values={{ minVersion }}
          />
        </EuiCallOut>
      );

    if (!initialValue)
      return (
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.sslKeySecretInputCalloutTitle"
          defaultMessage="This field uses secret storage and requires Fleet Server v{minVersion} and above."
          values={{ minVersion }}
        />
      );
    return undefined;
  }, [disabled, initialValue, isConvertedToSecret, minVersion]);

  const plainTextHelp = disabled ? null : (
    <FormattedMessage
      id="xpack.fleet.settings.editOutputFlyout.secretInputCalloutTitle"
      defaultMessage="This field should be stored as a secret, currently it is set to be stored as plain text. {enableSecretLink}"
      values={{
        enableSecretLink: (
          <EuiLink onClick={() => onToggleSecretStorage?.(true)} color="primary">
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.revertToSecretStorageLink"
              defaultMessage="Click to use secret storage instead"
            />
          </EuiLink>
        ),
      }}
    />
  );

  const inputComponent = editMode ? editValue : valueHiddenPanel;

  return useSecretsStorage ? (
    <EuiFormRow
      fullWidth={fullWidth}
      label={secretLabel}
      error={error}
      isInvalid={isInvalid}
      helpText={helpText}
    >
      {inputComponent}
    </EuiFormRow>
  ) : (
    <EuiFormRow
      fullWidth={fullWidth}
      error={error}
      isInvalid={isInvalid}
      label={label}
      helpText={plainTextHelp}
    >
      {inputComponent}
    </EuiFormRow>
  );
};
