/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

// ── SharedCredentialsForm component ──────────────────────────────────────────

interface SharedCredentialsFormProps {
  sharedCredentialFile: string;
  credentialProfileName: string;
  onSharedCredentialFileChange: (val: string) => void;
  onCredentialProfileNameChange: (val: string) => void;
}

export function SharedCredentialsForm({
  sharedCredentialFile,
  credentialProfileName,
  onSharedCredentialFileChange,
  onCredentialProfileNameChange,
}: SharedCredentialsFormProps) {
  return (
    <>
      <EuiFormRow
        label={i18n.translate(
          'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.sharedCredentials.fileLabel',
          { defaultMessage: 'Shared Credential File' }
        )}
        helpText={i18n.translate(
          'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.sharedCredentials.fileHelp',
          { defaultMessage: 'Directory of the shared credentials file' }
        )}
        fullWidth
      >
        <EuiFieldText
          fullWidth
          value={sharedCredentialFile}
          onChange={(e) => onSharedCredentialFileChange(e.target.value)}
          data-test-subj="agentBasedSection-sharedCredentialFile"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate(
          'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.sharedCredentials.profileLabel',
          { defaultMessage: 'Credential Profile Name' }
        )}
        fullWidth
      >
        <EuiFieldText
          fullWidth
          value={credentialProfileName}
          onChange={(e) => onCredentialProfileNameChange(e.target.value)}
          data-test-subj="agentBasedSection-credentialProfileName"
        />
      </EuiFormRow>
    </>
  );
}
