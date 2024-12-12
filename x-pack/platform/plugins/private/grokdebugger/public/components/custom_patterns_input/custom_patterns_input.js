/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiAccordion, EuiCallOut, EuiCodeBlock, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { CodeEditor } from '@kbn/code-editor';

export function CustomPatternsInput({ value, onChange }) {
  const sampleCustomPatterns = `POSTFIX_QUEUEID [0-9A-F]{10,11}
MSG message-id=<%{GREEDYDATA}>`;

  return (
    <EuiAccordion
      id="customPatternsInput"
      buttonContent={
        <FormattedMessage
          id="xpack.grokDebugger.customPatternsButtonLabel"
          defaultMessage="Custom Patterns"
        />
      }
      data-test-subj="btnToggleCustomPatternsInput"
    >
      <EuiSpacer size="m" />

      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.grokDebugger.customPatterns.callOutTitle"
            defaultMessage="Enter one custom pattern per line. For example:"
          />
        }
      >
        <EuiCodeBlock>{sampleCustomPatterns}</EuiCodeBlock>
      </EuiCallOut>

      <EuiSpacer size="m" />

      <EuiFormRow fullWidth data-test-subj="aceCustomPatternsInput">
        <CodeEditor
          languageId="plaintext"
          value={value}
          height={200}
          options={{
            tabSize: 2,
            automaticLayout: true,
          }}
          aria-label={i18n.translate('xpack.grokDebugger.customPatternsInput', {
            defaultMessage: 'Code editor for inputting custom patterns',
          })}
          onChange={onChange}
        />
      </EuiFormRow>
    </EuiAccordion>
  );
}
