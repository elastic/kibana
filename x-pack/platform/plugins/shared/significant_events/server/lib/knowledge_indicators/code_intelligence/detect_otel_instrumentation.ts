/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isExcludedLoggingPath, OTEL_INSTRUMENTATION_PATTERNS } from './constants';
import { codeGrep, splitRepository } from './discover_logging_sites';
import type { OtelDetection, OtelSignalCounts } from './types';

export const EMPTY_OTEL_SIGNAL_COUNTS: OtelSignalCounts = {
  instrumentation_grpc: 0,
  instrumentation_http: 0,
  instrumentation_other: 0,
  start_span: 0,
  set_attribute: 0,
  add_event: 0,
  record_exception: 0,
  set_status_error: 0,
  create_metric: 0,
};

const PRODUCTION_SOURCE_FILE_RE =
  /\.(?:[cm]?[jt]sx?|py|go|rs|java|kt|kts|scala|cs|rb|php|c|cc|cpp|h)$/i;
const OTEL_CONFIG_FILE_RE = /(?:otel|opentelemetry).*(?:\.ya?ml|\.json|\.toml|\.properties)$/i;
const EXCLUDED_OTEL_PATH_RE =
  /(?:^|\/)(?:docs?|examples?|vendor|dist|build|generated)(?:\/|$)|(?:^|\/)(?:package-lock\.json|yarn\.lock|pnpm-lock\.yaml|go\.sum|cargo\.lock)$/i;
const OTEL_IMPORT_OR_CONFIG_RE =
  /\b(?:import|from|require|using)\b[^\n]*(?:@opentelemetry\/|go\.opentelemetry\.io|opentelemetry)|\bOTEL_[A-Z0-9_]+\b/i;

/**
 * Whether a file path is eligible production OTel source: not a test/build,
 * docs, examples, vendor, generated, or lockfile path, and a real source or
 * OTel config file. Shared with the signal extractor so gate and extraction
 * apply one path policy.
 */
export const isProductionOtelPath = (filePath: string): boolean => {
  if (isExcludedLoggingPath(filePath) || EXCLUDED_OTEL_PATH_RE.test(filePath)) return false;
  return PRODUCTION_SOURCE_FILE_RE.test(filePath) || OTEL_CONFIG_FILE_RE.test(filePath);
};

const isProductionOtelSite = (
  filePath: string,
  content: string,
  isInstrumentation: boolean
): boolean => {
  if (!isProductionOtelPath(filePath)) return false;
  if (!isInstrumentation) return true;
  // Go grouped imports put the module string on a line below `import (`. The
  // module path itself is an unambiguous production import once dependency and
  // generated paths above have been excluded.
  if (/\.go$/i.test(filePath) && /go\.opentelemetry\.io\//i.test(content)) return true;
  return OTEL_IMPORT_OR_CONFIG_RE.test(content);
};

// `setAttribute` and `addEvent` also occur on DOM elements and event emitters.
// Requiring an OTel-ish receiver token on the matched line keeps a plain
// `element.setAttribute(...)` from counting as instrumentation, so the gate can
// keep the specified `importsDetected || idiomSites >= 3` invariant.
const AMBIGUOUS_IDIOM_KINDS = new Set<keyof OtelSignalCounts>(['set_attribute', 'add_event']);
const OTEL_RECEIVER_RE =
  /\b(?:span|otel_?span|active_?span|current_?span|activity|tracer|meter|scope)\b/i;

const isEligibleSite = (
  kind: keyof OtelSignalCounts,
  filePath: string,
  content: string
): boolean => {
  if (!isProductionOtelSite(filePath, content, kind.startsWith('instrumentation_'))) return false;
  if (AMBIGUOUS_IDIOM_KINDS.has(kind) && !OTEL_RECEIVER_RE.test(content)) return false;
  return true;
};

export interface DetectOtelInstrumentationOptions {
  esClient: ElasticsearchClient;
  repository: string;
  gitSha: string;
  serviceRoot: string;
  logger: Logger;
  perPatternLimit?: number;
}

/** Applies the OTel gate to a per-kind site-count vector. */
const computeDetection = (counts: OtelSignalCounts): OtelDetection => {
  const importsDetected =
    counts.instrumentation_grpc + counts.instrumentation_http + counts.instrumentation_other > 0;
  const idiomSites =
    counts.start_span +
    counts.set_attribute +
    counts.add_event +
    counts.record_exception +
    counts.set_status_error +
    counts.create_metric;
  // `set_attribute` and `add_event` alone are ambiguous (DOM `setAttribute`,
  // event emitters). Require at least one unambiguous OTel idiom — span start,
  // exception recording, error status, or metric instrument creation — before
  // an import-less service is gated, so 3 DOM `setAttribute` calls do not count.
  return { hasOtel: importsDetected || idiomSites >= 3, signalCounts: counts };
};

/**
 * Batched detector: greps each pattern ONCE at repository scope and buckets hits
 * to every candidate root that contains the file, so N roots cost O(patterns)
 * searches instead of O(N × patterns). Attribution is inclusive (a file under
 * `a/b` counts for both root `a` and root `a/b`), reproducing the per-root
 * `root/**` counts exactly. Never throws.
 */
export async function detectOtelInstrumentationForRoots({
  esClient,
  repository,
  gitSha,
  serviceRoots,
  logger,
  perPatternLimit = 2000,
}: {
  esClient: ElasticsearchClient;
  repository: string;
  gitSha: string;
  serviceRoots: string[];
  logger: Logger;
  perPatternLimit?: number;
}): Promise<Map<string, OtelDetection>> {
  const { org, repo } = splitRepository(repository);
  const normalizedRoots = serviceRoots.map((serviceRoot) => ({
    serviceRoot,
    normalized: serviceRoot.replace(/^\.[/\\]?$/, '').replace(/\/+$/, ''),
  }));
  const ownersOf = (filePath: string): string[] =>
    normalizedRoots
      .filter(
        ({ normalized }) =>
          normalized === '' || filePath === normalized || filePath.startsWith(`${normalized}/`)
      )
      .map(({ serviceRoot }) => serviceRoot);
  const sitesByRoot = new Map<string, Map<keyof OtelSignalCounts, Set<string>>>(
    normalizedRoots.map(({ serviceRoot }) => [serviceRoot, new Map()])
  );

  try {
    for (const [kind, patterns] of Object.entries(OTEL_INSTRUMENTATION_PATTERNS) as Array<
      [keyof OtelSignalCounts, readonly string[]]
    >) {
      for (const regex of patterns) {
        const hits = await codeGrep({
          esClient,
          gitOrg: org,
          gitRepo: repo,
          gitCommit: gitSha || '*',
          filePath: '**',
          regex,
          limit: perPatternLimit,
        });
        for (const hit of hits) {
          if (!isEligibleSite(kind, hit.filePath, hit.content)) continue;
          for (const owner of ownersOf(hit.filePath)) {
            const kinds = sitesByRoot.get(owner)!;
            const sites = kinds.get(kind) ?? new Set<string>();
            sites.add(`${hit.filePath}:${hit.lineNumber}`);
            kinds.set(kind, sites);
          }
        }
      }
    }
  } catch (error) {
    logger.debug(
      `otel_detection: batched grep failed for "${repository}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return new Map(
      normalizedRoots.map(({ serviceRoot }) => [
        serviceRoot,
        { hasOtel: false, signalCounts: { ...EMPTY_OTEL_SIGNAL_COUNTS } },
      ])
    );
  }

  const result = new Map<string, OtelDetection>();
  for (const { serviceRoot } of normalizedRoots) {
    const counts = { ...EMPTY_OTEL_SIGNAL_COUNTS };
    for (const [kind, sites] of sitesByRoot.get(serviceRoot)!) {
      counts[kind] = sites.size;
    }
    result.set(serviceRoot, computeDetection(counts));
  }
  return result;
}

/** Detects OTel imports and idiom sites for one service. Never throws. */
export async function detectOtelInstrumentation({
  esClient,
  repository,
  gitSha,
  serviceRoot,
  logger,
  perPatternLimit = 500,
}: DetectOtelInstrumentationOptions): Promise<OtelDetection> {
  const counts = { ...EMPTY_OTEL_SIGNAL_COUNTS };
  const { org, repo } = splitRepository(repository);
  const root = serviceRoot.replace(/^\.[/\\]?$/, '').replace(/\/+$/, '');
  const filePath = root ? `${root}/**` : '**';

  try {
    for (const [kind, patterns] of Object.entries(OTEL_INSTRUMENTATION_PATTERNS) as Array<
      [keyof OtelSignalCounts, readonly string[]]
    >) {
      const sites = new Set<string>();
      for (const regex of patterns) {
        const hits = await codeGrep({
          esClient,
          gitOrg: org,
          gitRepo: repo,
          gitCommit: gitSha || '*',
          filePath,
          regex,
          limit: perPatternLimit,
        });
        for (const hit of hits) {
          if (isEligibleSite(kind, hit.filePath, hit.content)) {
            sites.add(`${hit.filePath}:${hit.lineNumber}`);
          }
        }
      }
      counts[kind] = sites.size;
    }
  } catch (error) {
    logger.debug(
      `otel_detection: grep failed for "${repository}" @ "${root}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return { hasOtel: false, signalCounts: { ...EMPTY_OTEL_SIGNAL_COUNTS } };
  }

  return computeDetection(counts);
}
