/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const preconfiguredMessage = i18n.translate(
  'xpack.triggersActionsUI.sections.actionForm.preconfiguredTitleMessage',
  {
    defaultMessage: '(preconfigured)',
  }
);

export const deprecatedMessage = i18n.translate(
  'xpack.triggersActionsUI.sections.deprecatedTitleMessage',
  {
    defaultMessage: '(deprecated)',
  }
);

export const connectorDeprecatedMessage = i18n.translate(
  'xpack.triggersActionsUI.sections.isDeprecatedDescription',
  { defaultMessage: 'This connector is deprecated. Update it, or create a new one.' }
);
