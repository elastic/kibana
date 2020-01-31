/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiPanel, EuiCodeEditor } from '@elastic/eui';
import { EDITOR } from '../../../../../common/constants';
import { GrokMode } from '../../../../lib/ace';
import { FormattedMessage } from '@kbn/i18n/react';

export function PatternInput({ value, onChange }) {
  return (
    <EuiFormRow
      label={
        <FormattedMessage id="xpack.grokDebugger.grokPatternLabel" defaultMessage="Grok Pattern" />
      }
      fullWidth
      data-test-subj="acePatternInput"
    >
      <EuiPanel paddingSize="s">
        <EuiCodeEditor
          width="100%"
          value={value}
          onChange={onChange}
          mode={new GrokMode()}
          setOptions={{
            highlightActiveLine: false,
            highlightGutterLine: false,
            minLines: EDITOR.PATTERN_MIN_LINES,
            maxLines: EDITOR.PATTERN_MAX_LINES,
          }}
        />
      </EuiPanel>
    </EuiFormRow>
  );
}
