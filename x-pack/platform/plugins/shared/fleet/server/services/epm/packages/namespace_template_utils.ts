/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import type { IndexTemplate, RegistryDataStream } from '../../../types';
import { appContextService } from '../../app_context';
import { dataStreamUsesOtelInput } from '../../../../common/services';
import type { PackageInfo } from '../../../../common/types';
import { retryTransientEsErrors } from '../elasticsearch/retry';

/**
 * Returns true if any of the data stream's streams effectively use the OTel collector input
 * type AND OTel integrations are enabled. Resolves named inputs so that a stream referencing
 * an input by name (e.g. `otel_logs`) is correctly identified as OTel when its backing input
 * has `type: otelcol`.
 *
 * Shared between the namespace-scoped data stream template and ILM policy sync logic, which
 * both need to derive the same (possibly OTel-suffixed) base template name for a data stream.
 */
export function isOtelDataStream(
  dataStream: RegistryDataStream,
  packageInfo: Pick<PackageInfo, 'policy_templates'>
): boolean {
  const experimentalFeature = appContextService.getExperimentalFeatures();
  return (
    !!experimentalFeature?.enableOtelIntegrations &&
    dataStreamUsesOtelInput(packageInfo, dataStream)
  );
}

/**
 * Fetches an index template from ES and strips read-only date properties that cannot be set
 * on a subsequent PUT. Returns the cleaned template, or undefined if it does not exist.
 */
export async function fetchIndexTemplate(
  esClient: ElasticsearchClient,
  templateName: string,
  logContext: string,
  signal?: AbortSignal
): Promise<IndexTemplate | undefined> {
  const logger = appContextService.getLogger();
  let rawTemplate;
  try {
    const res = await esClient.indices.getIndexTemplate({ name: templateName }, { signal });
    rawTemplate = res.index_templates[0]?.index_template;
  } catch (err: unknown) {
    if ((err as { meta?: { statusCode?: number } })?.meta?.statusCode !== 404) {
      throw err;
    }
    logger.debug(`[${logContext}] index template ${templateName} not found, skipping`);
    return undefined;
  }

  if (!rawTemplate) {
    return undefined;
  }

  const {
    created_date: _cd,
    created_date_millis: _cdm,
    modified_date: _md,
    modified_date_millis: _mdm,
    ...indexTemplate
  } = rawTemplate as IndexTemplate;

  return indexTemplate;
}

/**
 * Runs a pre-flight check for pre-existing index template customization before Fleet
 * creates a namespace-scoped index template for a given data stream and namespace.
 *
 * Uses `POST /_index_template/_simulate_index/<indexName>` to discover which template
 * currently wins for the concrete data stream index. The ES response lists losing
 * templates in its `overlapping` field — the winning template is the one that is
 * _not_ listed there. When the Fleet-managed base template appears in `overlapping`,
 * that means a higher-priority template (e.g. a user-cloned base template) already
 * governs the index, and the namespace customization may not apply as expected or may
 * conflict on creation. Two sub-cases:
 *   - Clone at higher priority (> 250): Fleet's PUT succeeds but the clone wins silently.
 *   - Clone at equal priority (250): ES rejects Fleet's PUT with an `illegal_argument_exception`.
 *
 * Limitation — scenario not detected by this check: if a user edited the Fleet-managed
 * base template directly (without cloning it), the base template still wins in the
 * simulate response and no warning is emitted. Those inline edits are silently overridden
 * the next time Fleet reinstalls the package and rewrites the base template.
 *
 * This check is deliberately non-fatal: any error during the simulate call is
 * caught and `debug`-logged so the creation path is never blocked by the check.
 *
 * `dataset_is_prefix` data streams are skipped because their namespace index pattern
 * contains a wildcard and is not a valid concrete index name for `_simulate_index`.
 */
export async function warnIfPreexistingCustomization({
  esClient,
  dataStream,
  indexName,
  baseTemplateName,
  nsTemplateName,
  namespace,
  logger,
  logContext,
  signal,
}: {
  esClient: ElasticsearchClient;
  dataStream: RegistryDataStream;
  indexName: string;
  baseTemplateName: string;
  nsTemplateName: string;
  namespace: string;
  logger: Logger;
  logContext: string;
  signal?: AbortSignal;
}): Promise<void> {
  // _simulate_index requires a concrete (non-wildcard) index name.
  if (dataStream.dataset_is_prefix || indexName.includes('*')) {
    logger.debug(
      `[${logContext}] skipping pre-existing customization check for ${nsTemplateName} (dataset_is_prefix)`
    );
    return;
  }

  try {
    const res = await retryTransientEsErrors(
      () => esClient.indices.simulateIndexTemplate({ name: indexName }, { signal }),
      { logger }
    );

    const overlapping = res.overlapping ?? [];
    if (!overlapping.some((t) => t.name === baseTemplateName)) {
      // Base template wins — nothing to warn about.
      return;
    }

    // The base template is being overridden. Determine whether the winning template is
    // Fleet's own namespace template (expected on retries/reinstalls) or a user-created one.
    //
    // If the Fleet namespace template is itself in overlapping, something beats even it
    // (a user clone at priority > 250) — warn without further checks.
    //
    // If the Fleet namespace template is not in overlapping, it is either the winner
    // (from a previous successful sync) or does not exist yet (user clone is winning).
    // Fetch it to distinguish the two cases.
    if (!overlapping.some((t) => t.name === nsTemplateName)) {
      const existingNsTemplate = await fetchIndexTemplate(
        esClient,
        nsTemplateName,
        logContext,
        signal
      );
      if (existingNsTemplate) {
        // Fleet's own namespace template already exists and is winning over the base.
        // This is expected during retries or reinstalls — not a user customization.
        return;
      }
    }

    logger.warn(
      `[${logContext}] Pre-existing index template customization detected for data stream ` +
        `"${indexName}" (namespace "${namespace}"): the Fleet-managed base template ` +
        `"${baseTemplateName}" is overridden by a higher-priority template, so namespace ` +
        `customization "${nsTemplateName}" may not apply as expected or may fail to be ` +
        `created. Overlapping templates: [${overlapping.map((t) => t.name).join(', ')}]. ` +
        `To resolve this, remove or adjust the priority of the conflicting template, then ` +
        `opt the namespace out and back in to retry.`
    );
  } catch (err) {
    // Non-fatal: a failed pre-flight check must never block template creation.
    logger.debug(
      `[${logContext}] pre-existing customization check failed for ${nsTemplateName}: ${
        (err as Error).message
      }`
    );
  }
}
