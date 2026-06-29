/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type {
  InstallationStatusResponse,
  PerformInstallResponse,
} from '@kbn/product-doc-base-plugin/common/http_api/installation';
import type { ToolingLog } from '@kbn/tooling-log';

const ELASTIC_DOCS_INSTALLATION_STATUS_API_PATH = '/internal/product_doc_base/status';
const ELASTIC_DOCS_INSTALL_ALL_API_PATH = '/internal/product_doc_base/install';

/** Product doc + ELSER cold start on serverless Scout can exceed a single install POST. */
const INSTALL_WAIT_TIMEOUT_MS = 15 * 60 * 1000;
const STATUS_POLL_INTERVAL_MS = 5_000;
const MAX_INSTALL_ATTEMPTS = 3;

type EvalFetch = <T = unknown>(
  path: string,
  options?: { method?: string; body?: string; version?: string }
) => Promise<T>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatInstallFailure(status: InstallationStatusResponse): string | undefined {
  const reasons = Object.entries(status.perProducts ?? {})
    .filter(([, product]) => product.status === 'error' && product.failureReason)
    .map(([productName, product]) => `${productName}: ${product.failureReason}`);
  return reasons.length > 0 ? reasons.join('; ') : undefined;
}

async function getInstallationStatus(
  fetch: EvalFetch,
  inferenceId: string
): Promise<InstallationStatusResponse> {
  return fetch(
    `${ELASTIC_DOCS_INSTALLATION_STATUS_API_PATH}?inferenceId=${encodeURIComponent(inferenceId)}`
  );
}

async function waitForInstalledStatus(params: {
  fetch: EvalFetch;
  inferenceId: string;
  log: ToolingLog;
  deadlineMs: number;
}): Promise<InstallationStatusResponse> {
  const { fetch, inferenceId, log, deadlineMs } = params;
  const deadline = Date.now() + deadlineMs;

  while (Date.now() < deadline) {
    const status = await getInstallationStatus(fetch, inferenceId);

    if (status.overall === 'installed') {
      return status;
    }

    if (status.overall === 'installing' || status.overall === 'uninstalling') {
      log.info(`Elastic documentation status=${status.overall}; polling…`);
      await sleep(STATUS_POLL_INTERVAL_MS);
      continue;
    }

    return status;
  }

  throw new Error(
    `Timed out after ${deadlineMs}ms waiting for Elastic documentation to reach installed`
  );
}

async function triggerInstall(
  fetch: EvalFetch,
  inferenceId: string
): Promise<PerformInstallResponse> {
  return fetch(ELASTIC_DOCS_INSTALL_ALL_API_PATH, {
    method: 'POST',
    body: JSON.stringify({ inferenceId }),
  });
}

/**
 * Ensures product documentation indices exist before product_documentation evals run.
 * Retries install and polls through `installing` instead of failing on the first
 * `installed: false` response (common when ELSER is still warming on serverless).
 */
export async function ensureElasticDocumentationInstalled(params: {
  fetch: EvalFetch;
  log: ToolingLog;
  inferenceId?: string;
}): Promise<{ installedBySuite: boolean }> {
  const { fetch, log } = params;
  const inferenceId = params.inferenceId ?? defaultInferenceEndpoints.ELSER;

  let status = await getInstallationStatus(fetch, inferenceId);
  if (status.overall === 'installed') {
    log.debug('Elastic documentation already installed');
    return { installedBySuite: false };
  }

  if (status.overall === 'installing') {
    log.info('Elastic documentation install already in progress; waiting for completion');
    await waitForInstalledStatus({
      fetch,
      inferenceId,
      log,
      deadlineMs: INSTALL_WAIT_TIMEOUT_MS,
    });
    return { installedBySuite: false };
  }

  let installedBySuite = false;

  for (let attempt = 1; attempt <= MAX_INSTALL_ATTEMPTS; attempt++) {
    log.info(`Installing Elastic documentation (attempt ${attempt}/${MAX_INSTALL_ATTEMPTS})`);
    const installResponse = await triggerInstall(fetch, inferenceId);

    if (installResponse.installed) {
      installedBySuite = true;
      return { installedBySuite };
    }

    const installFailure = installResponse.failureReason
      ? ` install API: ${installResponse.failureReason}`
      : '';
    log.warning(
      `Install API returned installed=false${installFailure}; polling installation status`
    );

    try {
      status = await waitForInstalledStatus({
        fetch,
        inferenceId,
        log,
        deadlineMs: INSTALL_WAIT_TIMEOUT_MS,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      if (attempt === MAX_INSTALL_ATTEMPTS) {
        throw new Error(
          `Documentation did not install successfully before running evaluations.${installFailure} ${detail}`
        );
      }
      log.warning(`${detail}; retrying install`);
      await sleep(STATUS_POLL_INTERVAL_MS * attempt);
      continue;
    }

    if (status.overall === 'installed') {
      installedBySuite = true;
      return { installedBySuite };
    }

    const statusFailure = formatInstallFailure(status);
    if (attempt === MAX_INSTALL_ATTEMPTS) {
      throw new Error(
        `Documentation did not install successfully before running evaluations.${
          statusFailure ? ` ${statusFailure}` : installFailure
        }`
      );
    }

    log.warning(
      `Elastic documentation status=${status.overall}${
        statusFailure ? ` (${statusFailure})` : ''
      }; retrying install`
    );
    await sleep(STATUS_POLL_INTERVAL_MS * attempt);
  }

  throw new Error('Documentation did not install successfully before running evaluations.');
}
