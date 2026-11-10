/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/** Shown when the user can open the app but none of its experiences. */
export function StreamsNoAccessPrompt() {
  return (
    <EuiEmptyPrompt
      data-test-subj="streamsNoAccessPrompt"
      iconType="lock"
      title={
        <h2>
          {i18n.translate('xpack.streams.noAccessPrompt.title', {
            defaultMessage: 'Streams is not available',
          })}
        </h2>
      }
      body={i18n.translate('xpack.streams.noAccessPrompt.body', {
        defaultMessage:
          'Your role does not grant access to this part of Streams. Contact your administrator.',
      })}
    />
  );
}
