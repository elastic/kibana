/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LABEL = i18n.translate('xpack.evals.saveAsWorkflowButton.label', {
  defaultMessage: 'Save as workflow',
});

export const OPEN_SAVED = i18n.translate('xpack.evals.saveAsWorkflowButton.openSaved', {
  defaultMessage: 'Open saved workflow',
});

export const ERROR = i18n.translate('xpack.evals.saveAsWorkflowButton.error', {
  defaultMessage: 'Failed to save workflow',
});

export const success = (name: string) =>
  i18n.translate('xpack.evals.saveAsWorkflowButton.success', {
    defaultMessage: 'Saved workflow "{name}".',
    values: { name },
  });
