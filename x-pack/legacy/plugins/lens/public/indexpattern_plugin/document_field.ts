/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

/**
 * This is a special-case field which allows us to perform
 * document-level operations such as count.
 */
export const documentField = {
  name: i18n.translate('xpack.lens.indexPattern.records', {
    defaultMessage: 'Records',
  }),
  type: 'document',
  aggregatable: true,
  searchable: true,
};
