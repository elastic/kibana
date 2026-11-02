/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

// ── AssumeRoleForm component ──────────────────────────────────────────────────

interface AssumeRoleFormProps {
  roleArn: string;
  onRoleArnChange: (val: string) => void;
}

export function AssumeRoleForm({ roleArn, onRoleArnChange }: AssumeRoleFormProps) {
  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.ingestHub.authenticateAndDeployStep.agentBasedSection.assumeRole.roleArnLabel',
        { defaultMessage: 'Role ARN' }
      )}
      fullWidth
    >
      <EuiFieldText
        fullWidth
        value={roleArn}
        onChange={(e) => onRoleArnChange(e.target.value)}
        data-test-subj="agentBasedSection-roleArn"
      />
    </EuiFormRow>
  );
}
