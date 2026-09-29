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
import type {
  ConflictingTemplate,
  ConflictType,
  NamespaceConflictWarning,
} from '../../../../common/types/rest_spec/epm';
import { retryTransientEsErrors } from '../elasticsearch/retry';
import { getNamespaceTemplatePriority } from '../elasticsearch/template/template';

export type { NamespaceConflictWarning };

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
 * Returns true when `indexName` matches the ES wildcard `pattern` (supports `*` and `?`).
 */
function matchesIndexPattern(pattern: string, indexName: string): boolean {
  const regexStr =
    '^' +
    pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.') +
    '$';
  return new RegExp(regexStr).test(indexName);
}

function classifyConflict(templatePriority: number, nsPriority: number): ConflictType {
  if (templatePriority > nsPriority) return 'overrides_fleet';
  if (templatePriority === nsPriority) return 'blocked_by_same_priority';
  return 'overridden_by_fleet';
}

/** Minimal shape of one item from GET /_index_template. */
interface IndexTemplateEntry {
  name: string;
  index_template: { index_patterns?: string | string[]; priority?: number };
}

/**
 * Filters a pre-fetched list of index templates down to those whose index_patterns
 * match `indexName`, excluding known ES losers (`overlappingNames`) and Fleet-managed
 * templates (`excludeNames`). Returns one `ConflictingTemplate` per match.
 *
 * Blind-spot: if multiple user clones all beat Fleet's NS template priority (e.g. at 400
 * and 300), the simulate winner is the 400-clone; the 300-clone lands in `overlapping`
 * (it lost to the 400-clone) and is excluded here — even though it would still block
 * Fleet's NS template (250). As a result, only the top-priority conflict is reported.
 */
function findConflictingTemplates({
  allTemplates,
  indexName,
  overlappingNames,
  excludeNames,
  nsPriority,
}: {
  allTemplates: IndexTemplateEntry[];
  indexName: string;
  overlappingNames: Set<string>;
  excludeNames: Set<string>;
  nsPriority: number;
}): ConflictingTemplate[] {
  return allTemplates
    .filter(
      ({ name, index_template: tpl }) =>
        !overlappingNames.has(name) &&
        !excludeNames.has(name) &&
        ([] as string[])
          .concat(tpl.index_patterns ?? [])
          .some((p) => matchesIndexPattern(p, indexName))
    )
    .map(({ name, index_template: tpl }) => ({
      name,
      priority: tpl.priority ?? 0,
      conflictType: classifyConflict(tpl.priority ?? 0, nsPriority),
    }));
}

/**
 * Checks a single (dataStream, namespace) pair for pre-existing index template conflicts.
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
 * Returns a `NamespaceConflictWarning` when a conflict is detected, `null` otherwise.
 * Non-fatal: errors during the simulate call return `null` and are `debug`-logged so the
 * caller is never blocked.
 *
 * `dataset_is_prefix` data streams are skipped (return `null`) because their namespace
 * index pattern contains a wildcard, which is not a valid concrete index name for
 * `_simulate_index`.
 */
export async function checkNamespaceConflict({
  esClient,
  dataStream,
  indexName,
  baseTemplateName,
  nsTemplateName,
  namespace,
  logger,
  logContext,
  signal,
  allTemplates,
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
  /** Pre-fetched index template list. When provided the per-check GET /_index_template is skipped. */
  allTemplates?: IndexTemplateEntry[];
}): Promise<NamespaceConflictWarning | null> {
  // _simulate_index requires a concrete (non-wildcard) index name.
  if (dataStream.dataset_is_prefix || indexName.includes('*')) {
    logger.debug(
      `[${logContext}] skipping pre-existing customization check for ${nsTemplateName} (dataset_is_prefix)`
    );
    return null;
  }

  try {
    const res = await retryTransientEsErrors(
      () => esClient.indices.simulateIndexTemplate({ name: indexName }, { signal }),
      { logger }
    );

    const overlapping = res.overlapping ?? [];
    if (!overlapping.some((t) => t.name === baseTemplateName)) {
      // Base template wins — no conflict.
      return null;
    }

    // The base template is being overridden. Determine whether the winning template is
    // Fleet's own namespace template (expected on retries/reinstalls) or a user-created one.
    //
    // If the Fleet namespace template is itself in overlapping, something beats even it
    // (a user clone at priority > 250) — conflict without further checks.
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
        return null;
      }
    }

    const nsPriority = getNamespaceTemplatePriority(dataStream);

    // Use the pre-fetched list when the caller supplies one (e.g. runNamespacePreflightCheck
    // fetches once for all (dataStream × namespace) pairs). Fall back to a per-check fetch
    // for standalone / test invocations.
    let templateList: IndexTemplateEntry[];
    if (allTemplates) {
      templateList = allTemplates;
    } else {
      try {
        const { index_templates } = await retryTransientEsErrors(
          () => esClient.indices.getIndexTemplate({}, { signal }),
          { logger }
        );
        templateList = index_templates as IndexTemplateEntry[];
      } catch {
        logger.debug(`[${logContext}] could not list index templates to identify conflicting ones`);
        templateList = [];
      }
    }

    const conflictingTemplates = findConflictingTemplates({
      allTemplates: templateList,
      indexName,
      overlappingNames: new Set(overlapping.map((t) => t.name)),
      excludeNames: new Set([baseTemplateName, nsTemplateName]),
      nsPriority,
    });

    if (conflictingTemplates.length === 0) {
      // The simulate indicated a conflict but we could not identify any conflicting template
      // (e.g. allTemplates was empty because the fetch failed). Return null so callers never
      // receive an empty warning that has no actionable detail.
      logger.debug(
        `[${logContext}] conflict indicated by simulate but no conflicting templates identified for ${nsTemplateName}; skipping warning`
      );
      return null;
    }

    return {
      dataStreamName: indexName,
      namespace,
      baseTemplateName,
      nsTemplateName,
      conflictingTemplates,
    };
  } catch (err) {
    // Non-fatal: a failed check must never block the caller.
    logger.debug(
      `[${logContext}] pre-existing customization check failed for ${nsTemplateName}: ${
        (err as Error).message
      }`
    );
    return null;
  }
}
