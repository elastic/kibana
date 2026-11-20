/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TestEndpointResponse } from '../../../../../../../common/types';

interface TestEndpointResultProps {
  response: TestEndpointResponse;
}

export const TestEndpointResult: React.FC<TestEndpointResultProps> = ({ response }) => {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <>
      <EuiText size="xs" data-test-subj="testEndpointSummary">
        {response.statusCode === undefined
          ? i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.queryTime', {
              defaultMessage: 'Query time: {latencyMs}ms',
              values: { latencyMs: response.latencyMs },
            })
          : i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.responseSummary', {
              defaultMessage: 'Response: {statusCode} • Query time: {latencyMs}ms',
              values: { statusCode: response.statusCode, latencyMs: response.latencyMs },
            })}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiButtonEmpty
        size="xs"
        flush="left"
        color="text"
        onClick={() => setShowRaw((isShown) => !isShown)}
        data-test-subj="testEndpointRawToggle"
      >
        {showRaw
          ? i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.hideRaw', {
              defaultMessage: 'Hide raw response',
            })
          : i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.showRaw', {
              defaultMessage: 'Show raw response',
            })}
      </EuiButtonEmpty>
      {showRaw && (
        <EuiCodeBlock
          language="json"
          paddingSize="m"
          overflowHeight={300}
          isCopyable
          data-test-subj="testEndpointRawResponse"
        >
          {JSON.stringify(response.ok ? response.raw : response.error, null, 2)}
        </EuiCodeBlock>
      )}
    </>
  );
};
