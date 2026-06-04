/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function SignificantEventsNotEnabledPrompt() {
  return (
    <EuiEmptyPrompt
      data-test-subj="streamsSignificantEventsNotEnabledPrompt"
      iconType="bell"
      color="subdued"
      title={
        <h2>
          {i18n.translate('xpack.streams.significantEvents.notEnabledPrompt.title', {
            defaultMessage: 'Significant events is not enabled',
          })}
        </h2>
      }
      body={
        <EuiText>
          <p>
            {i18n.translate('xpack.streams.significantEvents.notEnabledPrompt.body', {
              defaultMessage:
                'Significant events is not available in this environment. Check that your license, pricing tier, settings and required features are enabled.',
            })}
          </p>
        </EuiText>
      }
    />
  );
}
