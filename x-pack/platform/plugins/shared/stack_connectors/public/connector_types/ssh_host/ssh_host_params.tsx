/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useLayoutEffect } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { CodeEditorField, SHELL_LANG_ID } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import {
  ActionConnectorMode,
  type ActionParamsProps,
} from '@kbn/triggers-actions-ui-plugin/public';

/** Sample that exercises shell highlighting and is safe to run on a host. */
const DEFAULT_TEST_SCRIPT = `# Greet each name when it is set
export NAME="world"
if [ -n "$NAME" ]; then
  echo "hello" $NAME
else
  echo "hello"
fi

for name in ada lin; do
  echo "hi" $name
done
`;

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
  executionMode,
}) => {
  const { subAction, subActionParams } = actionParams;
  const isTest = executionMode === ActionConnectorMode.Test;
  const script = subActionParams?.script ?? (isTest ? DEFAULT_TEST_SCRIPT : '');

  useLayoutEffect(() => {
    if (subAction !== 'exec') {
      editAction('subAction', 'exec', index);
    }
    if (isTest && subActionParams?.script == null) {
      editAction('subActionParams', { script: DEFAULT_TEST_SCRIPT }, index);
    }
  }, [editAction, index, isTest, subAction, subActionParams?.script]);

  const onScriptChange = useCallback(
    (value: string) => {
      editAction('subActionParams', { script: value }, index);
    },
    [editAction, index]
  );

  const scriptErrors = errors.script as string[] | undefined;
  const scriptLabel = i18n.translate(
    'xpack.stackConnectors.components.sshHost.params.script.label',
    {
      defaultMessage: 'Bash script',
    }
  );

  return (
    <EuiFormRow
      fullWidth
      label={scriptLabel}
      error={scriptErrors}
      isInvalid={Array.isArray(scriptErrors) && scriptErrors.length > 0}
    >
      <CodeEditorField
        languageId={SHELL_LANG_ID}
        value={script}
        onChange={onScriptChange}
        height={210}
        fullWidth
        dataTestSubj="sshHostScript"
        aria-label={scriptLabel}
        options={{
          quickSuggestions: true,
          glyphMargin: false,
          lineNumbersMinChars: 2,
        }}
      />
    </EuiFormRow>
  );
};

// eslint-disable-next-line import/no-default-export
export { SshHostParamsFields as default };
