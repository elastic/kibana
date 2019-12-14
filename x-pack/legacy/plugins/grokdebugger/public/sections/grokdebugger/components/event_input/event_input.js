/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiPanel, EuiCodeEditor } from '@elastic/eui';
import { EDITOR } from '../../../../../common/constants';
import { FormattedMessage } from '@kbn/i18n/react';

export function EventInput({ value, onChange }) {
  return (
    <EuiFormRow
      label={
        <FormattedMessage id="xpack.grokDebugger.sampleDataLabel" defaultMessage="Sample Data" />
      }
      fullWidth
      data-test-subj="aceEventInput"
    >
      <EuiPanel paddingSize="s">
        <EuiCodeEditor
          width="100%"
          value={value}
          onChange={onChange}
          setOptions={{
            highlightActiveLine: false,
            highlightGutterLine: false,
            minLines: EDITOR.SAMPLE_DATA_MIN_LINES,
            maxLines: EDITOR.SAMPLE_DATA_MAX_LINES,
          }}
        />
      </EuiPanel>
    </EuiFormRow>
  );
}
