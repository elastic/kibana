/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE = i18n.translate('xpack.automaticImport.step.review.title', {
  defaultMessage: 'Review results',
});
export const DESCRIPTION = i18n.translate('xpack.automaticImport.step.review.description', {
  defaultMessage:
    'Review all the fields and their values in your integration. Make any necessary adjustments to ensure accuracy.',
});

export const EDIT_PIPELINE_BUTTON = i18n.translate(
  'xpack.automaticImport.step.review.editPipeline',
  {
    defaultMessage: 'Edit pipeline',
  }
);
export const INGEST_PIPELINE_TITLE = i18n.translate(
  'xpack.automaticImport.step.review.ingestPipelineTitle',
  {
    defaultMessage: 'Ingest pipeline',
  }
);

export const SAVE_BUTTON = i18n.translate('xpack.automaticImport.step.review.save', {
  defaultMessage: 'Save',
});
