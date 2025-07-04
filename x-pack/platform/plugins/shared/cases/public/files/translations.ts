/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FILE_DELETE_REASON = (owner: string) =>
  i18n.translate('xpack.cases.files.deleteReason', {
    values: { owner },
    defaultMessage:
      'This file is managed by Cases. Navigate to the Cases page under {owner} to delete it.',
  });
