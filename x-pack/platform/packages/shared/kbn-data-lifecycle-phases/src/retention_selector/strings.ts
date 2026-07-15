/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const PREFIX = 'xpack.dataLifecyclePhases.retentionSelector';

export const retentionSelectorStrings = {
  noOptionsFoundDescription: i18n.translate(`${PREFIX}.noOptionsFoundDescription`, {
    defaultMessage: 'No options found',
  }),
  listAriaLabel: i18n.translate(`${PREFIX}.listAriaLabel`, {
    defaultMessage: 'Options list',
  }),
};
