/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { KbnClient } from '@kbn/test';
import { KbnClient as TestKbnClient } from '@kbn/test';
import { EVALS_DATASETS_URL } from '@kbn/evals-common';
import { wrapKbnClientWithRetries } from './kbn_client_with_retries';

export interface GetEvaluationsKbnClientParams {
  kbnClient: KbnClient;
  log: ToolingLog;
  evaluationsKbnUrl?: string;
  evaluationsKbnApiKey?: string;
  createKbnClient?: (args: { log: ToolingLog; url: string }) => KbnClient;
}

export function withKbnClientDefaultHeaders(
  kbnClient: KbnClient,
  defaultHeaders: Record<string, string>
): KbnClient {
  return new Proxy(kbnClient, {
    get(target, prop, receiver) {
      if (prop === 'request') {
        const request = target.request.bind(target);

        const requestWithHeaders: KbnClient['request'] = async (params) => {
          return request({
            ...params,
            headers: {
              ...defaultHeaders,
              ...params.headers,
            },
          });
        };

        return requestWithHeaders;
      }

      return Reflect.get(target, prop, receiver);
    },
  }) as KbnClient;
}

export function withKbnClientApiKeyAuth(kbnClient: KbnClient, apiKey: string): KbnClient {
  return withKbnClientDefaultHeaders(kbnClient, { Authorization: `ApiKey ${apiKey}` });
}

export function getEvaluationsKbnClient({
  kbnClient,
  log,
  evaluationsKbnUrl = process.env.EVALUATIONS_KBN_URL,
  evaluationsKbnApiKey = process.env.EVALUATIONS_KBN_API_KEY,
  createKbnClient = ({ log: logger, url }) => new TestKbnClient({ log: logger, url }),
}: GetEvaluationsKbnClientParams): KbnClient {
  if (!evaluationsKbnUrl) {
    return kbnClient;
  }

  const customKbnClient = createKbnClient({ log, url: evaluationsKbnUrl });
  const withAuth = evaluationsKbnApiKey
    ? withKbnClientApiKeyAuth(customKbnClient, evaluationsKbnApiKey)
    : customKbnClient;
  const withVersionHeader = withKbnClientDefaultHeaders(withAuth, {
    'elastic-api-version': '1',
  });

  return wrapKbnClientWithRetries({ kbnClient: withVersionHeader, log });
}

/**
 * Probes the target Kibana to check whether the evals plugin is enabled
 * by hitting a lightweight datasets list endpoint.
 */
export async function checkEvaluationsPluginEnabled({
  kbnClient,
  log,
}: {
  kbnClient: KbnClient;
  log: SomeDevLog;
}): Promise<boolean> {
  try {
    await kbnClient.request({
      path: EVALS_DATASETS_URL,
      method: 'GET',
      query: { page: 1, per_page: 1 },
      retries: 0,
    });
    log.info('Evals dataset management is available on the target Kibana');
    return true;
  } catch (error) {
    log.warning(
      'Evals dataset management is not available on the target Kibana. ' +
        'Dataset syncing will be skipped. To enable, set xpack.evals.enabled: true ' +
        'in the target Kibana configuration.'
    );
    return false;
  }
}
