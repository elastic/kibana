/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CloudOnboardingDeploymentAuthMethod } from '@kbn/fleet-plugin/public';

// ── Credential method type ────────────────────────────────────────────────────

export type AgentCredentialMethod =
  | 'static_keys'
  | 'temporary_keys'
  | 'shared_credentials'
  | 'assume_role';

/**
 * Maps an agent credential method to its SO authMethod value.
 * All agent methods now match the SO literals directly — no conversion needed.
 * identity_federation is a managed-integration-only method, so it falls back to static_keys.
 */
export function toSOAuthMethod(
  method: AgentCredentialMethod | undefined
): CloudOnboardingDeploymentAuthMethod {
  if (method === undefined) return 'static_keys';
  return method;
}

/**
 * Inverse of toSOAuthMethod — used when hydrating session storage on resume.
 * identity_federation is MI-only, so it maps to static_keys.
 * undefined → 'static_keys' (safe default).
 */
export function fromSOAuthMethod(
  authMethod: CloudOnboardingDeploymentAuthMethod | undefined
): AgentCredentialMethod {
  if (authMethod === 'identity_federation' || authMethod === undefined) {
    return 'static_keys';
  }
  return authMethod as AgentCredentialMethod;
}

export const CREDENTIAL_OPTIONS = [
  {
    value: 'static_keys' as AgentCredentialMethod,
    text: i18n.translate(
      'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.credentialMethod.directAccessKeys',
      { defaultMessage: 'Direct access keys' }
    ),
  },
  {
    value: 'temporary_keys' as AgentCredentialMethod,
    text: i18n.translate(
      'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.credentialMethod.temporaryKeys',
      { defaultMessage: 'Temporary security credentials' }
    ),
  },
  {
    value: 'shared_credentials' as AgentCredentialMethod,
    text: i18n.translate(
      'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.credentialMethod.sharedCredentials',
      { defaultMessage: 'Shared credentials file' }
    ),
  },
  {
    value: 'assume_role' as AgentCredentialMethod,
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
      <EuiSelect
        options={CREDENTIAL_OPTIONS}
        value={value}
        onChange={(e) => onChange(e.target.value as AgentCredentialMethod)}
        data-test-subj="agentBasedSection-credentialMethodSelect"
      />
    </EuiFormRow>
  );
}
