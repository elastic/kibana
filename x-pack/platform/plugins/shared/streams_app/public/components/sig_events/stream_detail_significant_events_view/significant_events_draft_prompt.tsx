/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

/**
 * Shown on the per-stream Significant events tab for draft streams. Drafts are queried at search
 * time through an ES|QL view and have no backing index to sample yet, so significant-events
 * generation can't run until the stream is materialized.
 */
export function SignificantEventsDraftPrompt() {
  return (
    <EuiEmptyPrompt
      data-test-subj="streamsSignificantEventsDraftPrompt"
      iconType="bell"
      color="subdued"
      title={
        <h2>
          {i18n.translate('xpack.streams.significantEvents.draftPrompt.title', {
            defaultMessage: 'Available after materialization',
          })}
        </h2>
      }
      body={
        <EuiText>
          <p>
            {i18n.translate('xpack.streams.significantEvents.draftPrompt.body', {
              defaultMessage:
                'This is a draft stream, which is processed at query time and has no stored data to analyze yet. Convert it to ingest-time to start generating significant events.',
            })}
          </p>
        </EuiText>
      }
    />
  );
}
