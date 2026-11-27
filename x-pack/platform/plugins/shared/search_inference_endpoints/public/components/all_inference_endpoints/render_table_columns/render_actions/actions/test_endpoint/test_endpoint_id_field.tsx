/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiCopy, EuiFieldText, EuiFormRow, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const COPY_ENDPOINT_ID_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.testEndpoint.copyEndpointId',
  { defaultMessage: 'Copy endpoint ID' }
);

interface TestEndpointIdFieldProps {
  inferenceId: string;
}

export const TestEndpointIdField: React.FC<TestEndpointIdFieldProps> = ({ inferenceId }) => (
  <EuiFormRow
    fullWidth
    label={i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.endpointLabel', {
      defaultMessage: 'Endpoint',
    })}
  >
    <EuiFieldText
      fullWidth
      readOnly
      value={inferenceId}
      data-test-subj="testEndpointId"
      append={
        <EuiCopy textToCopy={inferenceId}>
          {(copy) => (
            <EuiToolTip content={COPY_ENDPOINT_ID_LABEL} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="copy"
                color="text"
                onClick={copy}
                aria-label={COPY_ENDPOINT_ID_LABEL}
                data-test-subj="testEndpointCopyIdButton"
              />
            </EuiToolTip>
          )}
        </EuiCopy>
      }
    />
  </EuiFormRow>
);
