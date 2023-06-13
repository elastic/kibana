/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DENIED_TOOLTIP = ({ denied, total }: { denied: number; total: number }) =>
  i18n.translate('xpack.elasticAssistant.dataAnonymizationEditor.stats.deniedStat.deniedTooltip', {
    values: { denied, total },
    defaultMessage:
      '{denied} of {total} fields in this context are denied to be included in the conversation',
  });

export const DENIED = i18n.translate(
  'xpack.elasticAssistant.dataAnonymizationEditor.stats.deniedStat.deniedDescription',
  {
    defaultMessage: 'Denied',
  }
);
