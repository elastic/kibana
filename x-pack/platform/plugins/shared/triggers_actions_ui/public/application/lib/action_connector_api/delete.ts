/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '@kbn/core/public';
import { BASE_ACTION_API_PATH } from '../../constants';

export async function deleteActions({
  ids,
  http,
}: {
  ids: string[];
  http: HttpSetup;
}): Promise<{ successes: string[]; errors: string[] }> {
  const successes: string[] = [];
  const errors: string[] = [];

  const results = await Promise.allSettled(
    ids.map((id) =>
      http.delete<string>(`${BASE_ACTION_API_PATH}/connector/${encodeURIComponent(id)}`)
    )
  );

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      successes.push(result.value);
    } else {
      errors.push(result.reason);
    }
  });

  return { successes, errors };
}
