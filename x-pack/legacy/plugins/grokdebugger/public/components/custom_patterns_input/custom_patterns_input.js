/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiCallOut,
  EuiCodeBlock,
  EuiFormRow,
  EuiCodeEditor,
  EuiSpacer,
} from '@elastic/eui';
import { EDITOR } from '../../../common/constants';
import { FormattedMessage } from '@kbn/i18n/react';

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
        <EuiCodeEditor
          width="100%"
          theme="textmate"
          mode="text"
          value={value}
          onChange={onChange}
          setOptions={{
            highlightActiveLine: false,
            highlightGutterLine: false,
            minLines: EDITOR.PATTERN_MIN_LINES,
            maxLines: EDITOR.PATTERN_MAX_LINES,
          }}
        />
      </EuiFormRow>
    </EuiAccordion>
  );
}
