/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const REPLACEMENT_LABEL = i18n.translate('xpack.stackConnectors.replacementSoonLabel', {
  defaultMessage: 'Replacement soon',
});

export const REPLACEMENT_DESCRIPTION = i18n.translate(
  'xpack.stackConnectors.deprecatedBadgeDescription',
  {
    defaultMessage:
      'This type of connector will soon be deprecated. Only connectors created with the new AI Connector flow will remain. While you can still access existing connectors and create new ones with this flow, make sure to migrate in a timely manner to avoid interruptions in your workflow.',
  }
);
