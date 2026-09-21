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
  | 'direct_access_keys'
  | 'temporary_keys'
  | 'shared_credentials'
  | 'assume_role';

/**
 * Maps an agent credential method to its SO authMethod value.
 * direct_access_keys → 'static_keys' (same credential shape as MI static keys).
 * Others map verbatim to the new literals added in authMethod model version 2.
 */
export function toSOAuthMethod(
  method: AgentCredentialMethod | undefined
): CloudOnboardingDeploymentAuthMethod {
  if (method === 'direct_access_keys' || method === undefined) return 'static_keys';
  return method;
}

/**
 * Inverse of toSOAuthMethod — used when hydrating session storage on resume.
 * static_keys → 'direct_access_keys' (matches the context default at onboarding_flow_context.tsx:385).
 * undefined → 'direct_access_keys' (safe default).
 */
export function fromSOAuthMethod(
  authMethod: CloudOnboardingDeploymentAuthMethod | undefined
): AgentCredentialMethod {
  if (
    authMethod === 'identity_federation' ||
    authMethod === 'static_keys' ||
    authMethod === undefined
  ) {
    return 'direct_access_keys';
  }
  return authMethod;
}

export const CREDENTIAL_OPTIONS = [
  {
    value: 'direct_access_keys' as AgentCredentialMethod,
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
