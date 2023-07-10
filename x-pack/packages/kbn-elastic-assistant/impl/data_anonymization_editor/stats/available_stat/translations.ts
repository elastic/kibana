/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const AVAILABLE_TOOLTIP = (total: number) =>
  i18n.translate(
    'xpack.elasticAssistant.dataAnonymizationEditor.stats.availableStat.availableTooltip',
    {
      values: { total },
      defaultMessage:
        '{total} fields in this context are available to be included in the conversation',
    }
  );

export const AVAILABLE = i18n.translate(
  'xpack.elasticAssistant.dataAnonymizationEditor.stats.availableStat.availableDescription',
  {
    defaultMessage: 'Available',
  }
);
