/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function InsightError() {
  return (
    <EuiCallOut
      title={i18n.translate('xpack.observabilityAiAssistant.insight.error.title', {
        defaultMessage: 'Error',
      })}
      color="danger"
      iconType="error"
    >
      {i18n.translate('xpack.observabilityAiAssistant.insight.error.description', {
        defaultMessage: 'An error occured.',
      })}

      <EuiSpacer size="m" />

      <EuiButton
        data-test-subj="observabilityAiAssistantInsightErrorRegenerateButton"
        fill
        color="danger"
      >
        {i18n.translate('xpack.observabilityAiAssistant.insight.error.buttonLabel', {
          defaultMessage: 'Regenerate',
        })}
      </EuiButton>
    </EuiCallOut>
  );
}
