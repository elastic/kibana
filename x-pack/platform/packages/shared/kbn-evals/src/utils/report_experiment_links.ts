/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'child_process';
import type { SomeDevLog } from '@kbn/some-dev-log';
import { buildExperimentUrl } from './evals_ui_url';

/**
 * Resolves the Kibana that received the run's scores, mirroring `getEvaluationsKbnClient`:
 * `EVAL_KBN_URL` when set (CI and the golden-cluster profiles set it), otherwise the Kibana
 * Scout ran against. On Buildkite that Kibana is torn down with the job, so no URL is returned.
 */
export const resolveEvalsUiKibanaUrl = ({
  evaluationsKbnUrl,
  scoutKibanaUrl,
}: {
  evaluationsKbnUrl: string | undefined;
  scoutKibanaUrl: string | undefined;
}): string | undefined => {
  if (evaluationsKbnUrl) {
    return evaluationsKbnUrl;
  }
  return process.env.BUILDKITE_BUILD_ID ? undefined : scoutKibanaUrl;
};

interface ReportExperimentLinksOptions {
  log: SomeDevLog;
  /** Kibana holding the evals UI (see {@link resolveEvalsUiKibanaUrl}); nothing is reported when unset. */
  kibanaUrl: string | undefined;
  experimentIds: readonly string[];
  executionId?: string;
  suiteId?: string;
  modelId?: string;
  shardId?: string;
  spaceId?: string;
}

const toAnnotationContext = (suiteId: string | undefined): string => {
  const suiteKey = (suiteId ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return suiteKey ? `kbn-evals-experiments-${suiteKey}` : 'kbn-evals-experiments';
};

const buildLinks = (
  kibanaUrl: string,
  { experimentIds, executionId, spaceId }: ReportExperimentLinksOptions
): string[] => {
  // With an execution id the detail page shows every experiment of the
  // execution, so a single link covers all datasets the worker ran.
  const urls = executionId
    ? [buildExperimentUrl({ kibanaUrl, spaceId, experimentId: experimentIds[0], executionId })]
    : experimentIds.map((experimentId) => buildExperimentUrl({ kibanaUrl, spaceId, experimentId }));
  return urls.filter((url): url is string => Boolean(url));
};

const toAnnotationRow = (
  url: string,
  { suiteId, modelId, shardId }: ReportExperimentLinksOptions
): string => {
  const parts = [
    suiteId ? `**${suiteId}**` : undefined,
    modelId ? `model \`${modelId}\`` : undefined,
    shardId ? `shard \`${shardId}\`` : undefined,
  ].filter((part): part is string => Boolean(part));
  return `- [View eval results](${url})${parts.length > 0 ? ` · ${parts.join(' · ')}` : ''}\n`;
};

/**
 * Logs evals UI links for the experiments a worker ran and, on Buildkite,
 * appends them to a per-suite build annotation.
 */
export const reportExperimentLinks = (options: ReportExperimentLinksOptions): void => {
  const { log, kibanaUrl, experimentIds, suiteId } = options;
  if (!kibanaUrl || experimentIds.length === 0) {
    return;
  }

  const links = buildLinks(kibanaUrl, options);
  if (links.length === 0) {
    log.warning('Could not build evals UI links: the evaluations Kibana URL is not valid.');
    return;
  }

  for (const url of links) {
    log.info(`🔗 ${url}`);
  }

  if (!process.env.BUILDKITE_BUILD_ID) {
    return;
  }

  // Shards of a suite append concurrently, so rows are self-describing list
  // items rather than table rows that would need a single header.
  const body = links.map((link) => toAnnotationRow(link, options)).join('');
  try {
    // The body goes through stdin: as an argument, its leading `- ` would be
    // parsed as a flag and the agent would reject the call.
    execFileSync(
      'buildkite-agent',
      ['annotate', '--context', toAnnotationContext(suiteId), '--style', 'info', '--append'],
      { input: body, stdio: ['pipe', 'ignore', 'ignore'] }
    );
  } catch (error) {
    log.warning(`Could not add experiment links to the Buildkite annotation: ${error}`);
  }
};
