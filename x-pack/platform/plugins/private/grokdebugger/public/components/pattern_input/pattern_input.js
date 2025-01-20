/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { CodeEditor, GrokLang } from '@kbn/code-editor';

export function PatternInput({ value, onChange }) {
  return (
    <EuiFormRow
      label={
        <FormattedMessage id="xpack.grokDebugger.grokPatternLabel" defaultMessage="Grok Pattern" />
      }
      fullWidth
      data-test-subj="patternInput"
    >
      <CodeEditor
        languageId={GrokLang}
        value={value}
        height={200}
        options={{
          tabSize: 2,
          automaticLayout: true,
        }}
        aria-label={i18n.translate('xpack.grokDebugger.grokPatternAriaLabel', {
          defaultMessage: 'Code editor for inputting the grok pattern',
        })}
        onChange={onChange}
      />
    </EuiFormRow>
  );
}
