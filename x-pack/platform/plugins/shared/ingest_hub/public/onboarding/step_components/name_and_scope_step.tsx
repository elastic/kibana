/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

const DEV_STUB_NAME = 'My AWS Integration';
const DEV_STUB_SCOPE = 'All selected services';

interface NameAndScopeStepProps {
  onNext: () => void;
}

export function NameAndScopeStep({ onNext }: NameAndScopeStepProps) {
  return (
    <div data-test-subj="onboardingStep-name-and-scope">
      <EuiTitle size="s">
        <h2>Name &amp; Scope</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText color="subdued" size="s">
        <p>Dev stub — defaults are hard-coded for local testing.</p>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiForm component="div">
        <EuiFormRow label="Integration name">
          <EuiFieldText value={DEV_STUB_NAME} readOnly compressed />
        </EuiFormRow>
        <EuiFormRow label="Scope">
          <EuiFieldText value={DEV_STUB_SCOPE} readOnly compressed />
        </EuiFormRow>
      </EuiForm>
      <EuiSpacer size="l" />
      <EuiButton fill onClick={onNext} data-test-subj="nameAndScopeNextButton">
        Next
      </EuiButton>
    </div>
  );
}
