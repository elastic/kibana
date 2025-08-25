/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

export const fillGap = async ({
  http,
  ruleId,
  gapId,
}: {
  http: HttpSetup;
  ruleId: string;
  gapId: string;
}) => {
  await http.post<void>(`${INTERNAL_BASE_ALERTING_API_PATH}/rules/gaps/_fill_by_id`, {
    query: { rule_id: ruleId, gap_id: gapId },
  });

  return;
};
