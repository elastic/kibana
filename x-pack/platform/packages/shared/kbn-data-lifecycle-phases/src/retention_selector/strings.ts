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
  methodFilterButtonLabel: i18n.translate(`${PREFIX}.methodFilterButtonLabel`, {
    defaultMessage: 'Method',
  }),
  methodFilterPopoverAriaLabel: i18n.translate(`${PREFIX}.methodFilterPopoverAriaLabel`, {
    defaultMessage: 'Method filter',
  }),
  methodFilterSelectableAriaLabel: i18n.translate(`${PREFIX}.methodFilterSelectableAriaLabel`, {
    defaultMessage: 'Filter by method',
  }),
};
