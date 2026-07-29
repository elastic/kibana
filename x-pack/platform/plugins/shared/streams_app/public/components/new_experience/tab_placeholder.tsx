/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface TabPlaceholderProps {
  'data-test-subj': string;
}

export const TabPlaceholder = ({ 'data-test-subj': dataTestSubj }: TabPlaceholderProps) => (
  <EuiEmptyPrompt
    iconType="clock"
    data-test-subj={dataTestSubj}
    title={
      <h2>
        {i18n.translate('xpack.streams.newExperience.tabPlaceholder.title', {
          defaultMessage: 'Coming soon',
        })}
      </h2>
    }
    body={
      <p>
        {i18n.translate('xpack.streams.newExperience.tabPlaceholder.body', {
          defaultMessage: 'This part of the Streams experience is not available yet.',
        })}
      </p>
    }
  />
);
