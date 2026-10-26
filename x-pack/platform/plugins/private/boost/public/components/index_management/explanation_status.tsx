/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const LOADING_LABEL = i18n.translate('xpack.boost.indexManagement.loading', {
  defaultMessage: 'Loading search boost…',
});

export const EXPLANATION_ERROR_LABEL = i18n.translate('xpack.boost.indexManagement.loadError', {
  defaultMessage: 'Unable to load search boost',
});

// Elasticsearch doesn't boost system indices, so no rule applies to them.
export const NO_RULE_LABEL = i18n.translate('xpack.boost.indexManagement.noRule', {
  defaultMessage: 'No boost rule applies',
});

/** Says what applies couldn't load, in Index Management's own warning color for that. */
export const ExplanationError = () => (
  <EuiTextColor color="warning" data-test-subj="boostExplanationError">
    {EXPLANATION_ERROR_LABEL}
  </EuiTextColor>
);
