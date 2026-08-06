/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiFormRow, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';

interface SshHostActionParams {
  subAction: 'exec';
  subActionParams: {
    script: string;
  };
}

const SshHostParamsFields: React.FunctionComponent<ActionParamsProps<SshHostActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
}) => {
  const { subAction, subActionParams } = actionParams;
  const script = subActionParams?.script ?? '';

  useEffect(() => {
    if (subAction !== 'exec') {
      editAction('subAction', 'exec', index);
    }
  }, [editAction, index, subAction]);

  const scriptErrors = errors.script as string[] | undefined;

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('xpack.stackConnectors.components.sshHost.params.script.label', {
        defaultMessage: 'Bash script',
      })}
      error={scriptErrors}
      isInvalid={Array.isArray(scriptErrors) && scriptErrors.length > 0}
    >
      <EuiTextArea
        fullWidth
        rows={10}
        value={script}
        onChange={(e) => editAction('subActionParams', { script: e.target.value }, index)}
        data-test-subj="sshHostScript"
      />
    </EuiFormRow>
  );
};

// eslint-disable-next-line import/no-default-export
export { SshHostParamsFields as default };
