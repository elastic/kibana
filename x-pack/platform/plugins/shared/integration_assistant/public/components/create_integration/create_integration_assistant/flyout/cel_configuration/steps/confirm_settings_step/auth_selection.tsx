/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiCallOut,
  EuiComboBox,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import * as i18n from './translations';
import { translateDisplayAuthToType } from './confirm_settings_step';

const AUTH_OPTIONS = ['Basic', 'OAuth2', 'Digest', 'API Token'];

const isRecommended = (auth: string, specDefinedAuthTypes: string[]): boolean => {
  return specDefinedAuthTypes.includes(translateDisplayAuthToType(auth));
};

interface AuthSelectionProps {
  selectedAuth: string | undefined;
  specifiedAuthForPath: string[];
  invalidAuth: boolean;
  isGenerating: boolean;
  showValidation: boolean;
  onChangeAuth(update: EuiComboBoxOptionOption[]): void;
}

export const AuthSelection = React.memo<AuthSelectionProps>(
  ({
    selectedAuth,
    specifiedAuthForPath,
    invalidAuth,
    isGenerating,
    showValidation,
    onChangeAuth,
  }) => {
    const options = AUTH_OPTIONS.map<EuiComboBoxOptionOption>((option) => ({
      id: option,
      label: option,
      ...(isRecommended(option, specifiedAuthForPath) && {
        append: <EuiBadge>{i18n.RECOMMENDED}</EuiBadge>,
      }),
    }));

    return (
      <EuiFormRow fullWidth data-test-subj="confirmAuth">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>{i18n.CONFIRM_AUTH}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s">{i18n.CONFIRM_AUTH_DESCRIPTION}</EuiText>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.AUTH_SELECTION_TITLE}
            fullWidth
            isInvalid={showValidation && selectedAuth === undefined}
            error={i18n.AUTH_REQUIRED}
          >
            <EuiComboBox
              singleSelection={{ asPlainText: true }}
              fullWidth
              isDisabled={isGenerating}
              isInvalid={showValidation && selectedAuth === undefined}
              options={options}
              selectedOptions={selectedAuth === undefined ? undefined : [{ label: selectedAuth }]}
              onChange={onChangeAuth}
              data-test-subj="authInputComboBox"
            />
          </EuiFormRow>
          {invalidAuth && (
            <EuiFlexItem>
              <EuiSpacer size="m" />
              <EuiCallOut
                title={i18n.AUTH_DOES_NOT_ALIGN}
                size="s"
                color="warning"
                iconType="warning"
                data-test-subj="authDoesNotAlignWarning"
              />
            </EuiFlexItem>
          )}
        </EuiFlexItem>
      </EuiFormRow>
    );
  }
);
AuthSelection.displayName = 'AuthSelection';
