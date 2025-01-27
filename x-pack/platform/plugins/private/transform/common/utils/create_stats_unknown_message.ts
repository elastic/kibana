/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export function createNoStatsTooltipMessage({
  actionName,
  count = 1,
}: {
  actionName: string;
  count: number;
}) {
  return i18n.translate('xpack.transform.transformList.actionDisabledNoStatsTooltipMessage', {
    defaultMessage:
      '{actionName} is disabled because the status for {count, plural, one {this transform} other {some transforms}} is unavailable.',
    values: { actionName, count },
  });
}
