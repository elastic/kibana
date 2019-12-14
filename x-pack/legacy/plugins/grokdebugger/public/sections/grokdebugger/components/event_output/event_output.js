/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiPanel, EuiCodeEditor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export function EventOutput({ value }) {
  return (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.grokDebugger.structuredDataLabel"
          defaultMessage="Structured Data"
        />
      }
      fullWidth
      data-test-subj="aceEventOutput"
    >
      <EuiPanel paddingSize="s">
        <EuiCodeEditor
          mode="json"
          isReadOnly
          width="100%"
          height="340px"
          value={JSON.stringify(value, null, 2)}
          setOptions={{
            highlightActiveLine: false,
            highlightGutterLine: false,
          }}
        />
      </EuiPanel>
    </EuiFormRow>
  );
}
