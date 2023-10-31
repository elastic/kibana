/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALLOWED_TOOLTIP = ({ allowed, total }: { allowed: number; total: number }) =>
  i18n.translate(
    'xpack.elasticAssistant.dataAnonymizationEditor.stats.allowedStat.allowedTooltip',
    {
      values: { allowed, total },
      defaultMessage:
        '{allowed} of {total} fields in this context are allowed to be included in the conversation',
    }
  );

export const ALLOWED = i18n.translate(
  'xpack.elasticAssistant.dataAnonymizationEditor.stats.allowedStat.allowedDescription',
  {
    defaultMessage: 'Allowed',
  }
);
