/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { BASE_ALERTING_API_PATH } from '../../constants';

export async function unmuteRule({ id, http }: { id: string; http: HttpSetup }): Promise<void> {
  await http.post(`${BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(id)}/_unmute_all`);
}

export async function unmuteRules({
  ids,
  http,
}: {
  ids: string[];
  http: HttpSetup;
}): Promise<void> {
  await Promise.all(ids.map((id) => unmuteRule({ id, http })));
}
