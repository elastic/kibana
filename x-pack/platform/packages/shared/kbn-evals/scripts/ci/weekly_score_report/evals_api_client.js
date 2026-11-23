/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const EVALS_INTERNAL_URL = '/internal/evals';
const EXPERIMENTS_PAGE_SIZE = 100;
const MAX_EXPERIMENT_PAGES = 5;
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Reads eval scores through the evals plugin's internal API on the evaluations cluster,
 * with the same `EVAL_KBN_URL` / `EVAL_KBN_API_KEY` credentials CI exports for exporting scores.
 */
const createEvalsApiClient = ({ kibanaUrl, apiKey, fetchImpl = fetch }) => {
  if (!kibanaUrl || !apiKey) {
    throw new Error('EVAL_KBN_URL and EVAL_KBN_API_KEY are required to read eval scores');
  }
  const baseUrl = kibanaUrl.replace(/\/+$/, '');

  const get = async (path, query = {}) => {
    const params = new URLSearchParams(
      Object.entries(query).filter(([, value]) => value !== undefined && value !== '')
    );
    const url = `${baseUrl}${EVALS_INTERNAL_URL}${path}${params.size ? `?${params}` : ''}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetchImpl(url, {
        headers: {
          authorization: `ApiKey ${apiKey}`,
          'elastic-api-version': '1',
          'x-elastic-internal-origin': 'kibana',
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        throw new Error(`GET ${path} failed (${response.status}): ${detail}`);
      }
      return response.json();
    } finally {
      clearTimeout(timer);
    }
  };

  const listExperiments = async ({ suiteId, branch }) => {
    const experiments = [];
    for (let page = 1; page <= MAX_EXPERIMENT_PAGES; page++) {
      const body = await get('/experiments', {
        suite_id: suiteId,
        branch,
        per_page: EXPERIMENTS_PAGE_SIZE,
        page,
      });
      const pageItems = Array.isArray(body?.experiments) ? body.experiments : [];
      experiments.push(...pageItems);
      if (pageItems.length < EXPERIMENTS_PAGE_SIZE || experiments.length >= (body?.total ?? 0)) {
        break;
      }
    }
    return experiments;
  };

  // The `{experimentId}` path segment is ignored when `execution_id` is set.
  const getExecution = (executionId) => get('/experiments/_', { execution_id: executionId });

  const compareExecutions = (baselineId, targetId) =>
    get('/experiments/compare', {
      type: 'execution',
      baseline_id: baselineId,
      target_id: targetId,
    });

  const getDatasetExamples = async (executionId, datasetId) => {
    const body = await get(`/experiments/_/datasets/${encodeURIComponent(datasetId)}/examples`, {
      execution_id: executionId,
      include_previews: 'true',
    });
    return Array.isArray(body?.examples) ? body.examples : [];
  };

  return { baseUrl, listExperiments, getExecution, compareExecutions, getDatasetExamples };
};

module.exports = { createEvalsApiClient };
