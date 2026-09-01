/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const EisNoModelsPrompt = () => (
  <EuiEmptyPrompt
    data-test-subj="eisNoModelsFound"
    color="subdued"
    title={
      <h3>
        {i18n.translate('xpack.searchInferenceEndpoints.eisModelspage.noResults', {
          defaultMessage: 'No models found',
        })}
      </h3>
    }
    titleSize="xs"
  />
);
