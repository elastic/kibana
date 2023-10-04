/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiTitle, EuiText, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';

import * as i18n from './translations';

interface Props {
  onAdvancedSettingsChange?: () => void;
}

/**
 * Advanced Settings -- your catch-all container for settings that don't have a home elsewhere.
 */
export const AdvancedSettings: React.FC<Props> = React.memo(({ onAdvancedSettingsChange }) => {
  return (
    <>
      <EuiTitle size={'s'}>
        <h2>{i18n.SETTINGS_TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="xs" />

      <EuiText size={'s'}>{i18n.SETTINGS_DESCRIPTION}</EuiText>

      <EuiHorizontalRule margin={'s'} />

      <EuiFormRow display="rowCompressed" label={'Disable LocalStorage'}>
        <>{'Disable LocalStorage'}</>
      </EuiFormRow>
      <EuiFormRow display="rowCompressed" label={'Clear LocalStorage'}>
        <>{'Clear LocalStorage'}</>
      </EuiFormRow>
      <EuiFormRow display="rowCompressed" label={'Reset Something Else'}>
        <>{'Reset Something Else'}</>
      </EuiFormRow>
    </>
  );
});

AdvancedSettings.displayName = 'AdvancedSettings';
