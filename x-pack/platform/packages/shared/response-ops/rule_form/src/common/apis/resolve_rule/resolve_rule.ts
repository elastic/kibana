/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { AsApiContract } from '@kbn/actions-types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../constants';
import { transformResolvedRule } from '../../transformations';
import type { ResolvedRule } from '../../types';

export async function resolveRule({
  http,
  id,
}: {
  http: HttpSetup;
  id: string;
}): Promise<ResolvedRule> {
  const res = await http.get<AsApiContract<ResolvedRule>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(id)}/_resolve`
  );
  return transformResolvedRule(res);
}
