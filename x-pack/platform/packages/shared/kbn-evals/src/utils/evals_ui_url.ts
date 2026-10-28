/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/evals-common';

const EVALS_UI_APP_PATH = '/app/management/ai/evals';

interface EvalsUiUrlOptions {
  /** Kibana URL as configured in `EVAL_KBN_URL`; may embed credentials. */
  kibanaUrl: string;
  /** Space the data was written to; the default space adds no `/s/<space>` prefix. */
  spaceId?: string;
}

const buildEvalsUiUrl = (
  { kibanaUrl, spaceId }: EvalsUiUrlOptions,
  path: string,
  query: Record<string, string | undefined>
): string | undefined => {
  let url: URL;
  try {
    url = new URL(kibanaUrl);
  } catch {
    return undefined;
  }

  // Links end up in logs and build annotations, so anything that may carry a
  // secret (userinfo, query, fragment) is dropped from the configured URL.
  url.username = '';
  url.password = '';
  url.search = '';
  url.hash = '';

  const basePath = url.pathname.replace(/\/+$/, '');
  const spacePrefix =
    spaceId && spaceId !== DEFAULT_SPACE_ID ? `/s/${encodeURIComponent(spaceId)}` : '';
  url.pathname = `${basePath}${spacePrefix}${EVALS_UI_APP_PATH}${path}`;

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
};

/** Builds the evals UI link to an experiment, or `undefined` when `kibanaUrl` is not a valid URL. */
export const buildExperimentUrl = ({
  experimentId,
  executionId,
  ...options
}: EvalsUiUrlOptions & { experimentId: string; executionId?: string }): string | undefined =>
  buildEvalsUiUrl(options, `/experiments/${encodeURIComponent(experimentId)}`, {
    execution_id: executionId,
  });

/** Builds the evals UI link comparing two executions, or `undefined` when `kibanaUrl` is not a valid URL. */
export const buildExecutionCompareUrl = ({
  baselineExecutionId,
  targetExecutionId,
  ...options
}: EvalsUiUrlOptions & {
  baselineExecutionId: string;
  targetExecutionId: string;
}): string | undefined =>
  buildEvalsUiUrl(options, '/compare', {
    type: 'execution',
    baseline: baselineExecutionId,
    target: targetExecutionId,
  });
