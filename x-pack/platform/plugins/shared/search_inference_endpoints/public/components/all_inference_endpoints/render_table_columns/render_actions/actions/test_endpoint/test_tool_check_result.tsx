/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { KbnSuccessCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type { TestEndpointToolCheck } from '../../../../../../../common/types';

interface TestToolCheckResultProps {
  toolCheck: TestEndpointToolCheck;
}

export const TestToolCheckResult: React.FC<TestToolCheckResultProps> = ({ toolCheck }) => {
  if (!toolCheck.passed) {
    return (
      <KbnWarningCallout
        data-test-subj="testEndpointToolCheckFailed"
        title={i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.toolCheckFailed', {
          defaultMessage: 'The model answered without calling the tool.',
        })}
        text={i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.toolCheckFailedText', {
          defaultMessage: 'It may not support tool calling, which Agent Builder needs.',
        })}
      />
    );
  }

  if (toolCheck.followUpError) {
    return (
      <KbnWarningCallout
        data-test-subj="testEndpointToolCheckFollowUpFailed"
        title={i18n.translate(
          'xpack.searchInferenceEndpoints.testEndpoint.toolCheckFollowUpFailed',
          {
            defaultMessage: 'The model called the tool, but the follow-up request failed.',
          }
        )}
        text={toolCheck.followUpError}
      />
    );
  }

  return (
    <KbnSuccessCallout
      data-test-subj="testEndpointToolCheckPassed"
      title={i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.toolCheckPassed', {
        defaultMessage: 'The model called the tool.',
      })}
      text={i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.toolCheckPassedText', {
        defaultMessage: '{call} returned "{result}", and the model used it in its answer.',
        values: {
          call: `${toolCheck.toolName}(${JSON.stringify(toolCheck.arguments)})`,
          result: toolCheck.toolResult,
        },
      })}
    />
  );
};
