/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AwsAuthTypeSelector } from '@kbn/fleet-plugin/public';

// ── Credential method type ────────────────────────────────────────────────────

export type AgentCredentialMethod =
  | 'direct_access_keys'
  | 'temporary_keys'
  | 'shared_credentials'
  | 'assume_role';

const CREDENTIAL_OPTIONS = [
  {
    value: 'direct_access_keys',
    text: i18n.translate(
      'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.credentialMethod.directAccessKeys',
      { defaultMessage: 'Direct access keys' }
    ),
  },
  {
    value: 'temporary_keys',
    text: i18n.translate(
      'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.credentialMethod.temporaryKeys',
      { defaultMessage: 'Temporary security credentials' }
    ),
  },
  {
    value: 'shared_credentials',
    text: i18n.translate(
      'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.credentialMethod.sharedCredentials',
      { defaultMessage: 'Shared credentials file' }
    ),
  },
  {
    value: 'assume_role',
    text: i18n.translate(
      'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.credentialMethod.assumeRole',
      { defaultMessage: 'Assume role' }
    ),
  },
];

// ── CredentialMethodSelector component ───────────────────────────────────────

interface CredentialMethodSelectorProps {
  value: AgentCredentialMethod;
  onChange: (method: AgentCredentialMethod) => void;
}

export function CredentialMethodSelector({ value, onChange }: CredentialMethodSelectorProps) {
  return (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.credentialMethodLabel"
          defaultMessage="Preferred method"
        />
      }
    >
      <AwsAuthTypeSelector
        selectedAuthType={value}
        options={CREDENTIAL_OPTIONS}
        onChange={(method) => onChange(method as AgentCredentialMethod)}
        data-test-subj="agentBasedSection-credentialMethodSelect"
      />
    </EuiFormRow>
  );
}
