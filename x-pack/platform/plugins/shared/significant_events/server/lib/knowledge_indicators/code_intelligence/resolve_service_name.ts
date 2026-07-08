/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERVICE_NAME_SIGNAL_WEIGHT, type ServiceNameSignal } from './constants';
import type { CodeHit, ServiceNameCandidate, ServiceNameResolution } from './types';

/** Verification bonus applied on top of the signal weight. */
const EXACT_MATCH_BONUS = 120;
const NORMALIZED_MATCH_BONUS = 60;

/**
 * Normalize a service name for fuzzy comparison: lowercase, unify `-`/`_`, and
 * drop a trailing `-service` / `_service` suffix (e.g. `checkout-service` and
 * `checkoutservice` collapse to `checkout`).
 */
export function normalizeServiceName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, '-')
    .replace(/-?service$/, '');
}

interface ScoredCandidate {
  candidate: ServiceNameCandidate;
  score: number;
  exactMatch?: string;
  normalizedMatch?: string;
}

/**
 * Pure ranking of service-name candidates against the values actually observed
 * in logs. Env-injection candidates outrank SDK config, which outrank
 * deployment identity, which outrank manifest names; a candidate verified in
 * logs is boosted above unverified ones of the same signal. When nothing is
 * observed in logs the highest-priority candidate is kept as a *predicted*
 * value (what enables predictive Query KIs).
 */
export function rankServiceName(
  candidates: ServiceNameCandidate[],
  observedServiceNames: string[]
): ServiceNameResolution | undefined {
  if (candidates.length === 0) {
    return undefined;
  }

  const observedByNormalized = new Map<string, string>();
  for (const observed of observedServiceNames) {
    observedByNormalized.set(normalizeServiceName(observed), observed);
  }
  const observedExact = new Set(observedServiceNames.map((value) => value.trim().toLowerCase()));

  const scored: ScoredCandidate[] = candidates.map((candidate) => {
    const weight = SERVICE_NAME_SIGNAL_WEIGHT[candidate.signal];
    const exactMatch = observedExact.has(candidate.value.trim().toLowerCase())
      ? candidate.value
      : undefined;
    const normalizedMatch = observedByNormalized.get(normalizeServiceName(candidate.value));

    let score = weight;
    if (exactMatch) {
      score += EXACT_MATCH_BONUS;
    } else if (normalizedMatch) {
      score += NORMALIZED_MATCH_BONUS;
    }

    return { candidate, score, exactMatch, normalizedMatch };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  // Prefer the value as it actually appears in logs when we have a match.
  const verifiedValue = best.exactMatch ?? best.normalizedMatch;
  const predicted = verifiedValue === undefined;
  const value = verifiedValue ?? best.candidate.value;

  // Confidence: the winning score capped to 0-100, so a code-only (predicted)
  // env-injection candidate lands high but below a log-verified one.
  const confidence = Math.max(0, Math.min(100, best.score));

  const evidence = collectEvidence(scored, value, verifiedValue);

  return { value, confidence, predicted, evidence };
}

function collectEvidence(
  scored: ScoredCandidate[],
  resolvedValue: string,
  verifiedValue: string | undefined
): string[] {
  const normalizedResolved = normalizeServiceName(resolvedValue);
  const evidence: string[] = [];
  for (const { candidate } of scored) {
    if (normalizeServiceName(candidate.value) === normalizedResolved) {
      evidence.push(candidate.evidence);
    }
  }
  if (verifiedValue !== undefined) {
    evidence.push(`logs: observed service.name=${verifiedValue}`);
  }
  return evidence;
}

interface CandidateMatcher {
  signal: ServiceNameSignal;
  source: 'iac' | 'app';
  /** SCS `code_search` query used to locate hits. */
  query: string;
  /** Extracts the assigned service name from a matching snippet. */
  extract: (snippet: string) => string | undefined;
}

const value = '([\\w.-]+)';
const assign = (key: string) => new RegExp(`${key}\\s*[:=]\\s*["']?${value}`, 'i');

/**
 * Ordered set of matchers, highest-signal first. IaC env injection is the most
 * direct predictor of `service.name`; manifest names are the weakest.
 */
export const SERVICE_NAME_MATCHERS: CandidateMatcher[] = [
  {
    signal: 'env_injection',
    source: 'iac',
    query: 'OTEL_SERVICE_NAME environment variable service name',
    extract: (snippet) => match(snippet, assign('OTEL_SERVICE_NAME')),
  },
  {
    signal: 'env_injection',
    source: 'iac',
    query: 'ELASTIC_APM_SERVICE_NAME environment variable',
    extract: (snippet) => match(snippet, assign('ELASTIC_APM_SERVICE_NAME')),
  },
  {
    signal: 'env_injection',
    source: 'iac',
    query: 'OTEL_RESOURCE_ATTRIBUTES service.name',
    extract: (snippet) => match(snippet, /service\.name\s*=\s*["']?([\w.-]+)/i),
  },
  {
    signal: 'sdk_config',
    source: 'app',
    query: 'set service name OpenTelemetry resource service.name',
    extract: (snippet) =>
      match(snippet, /setServiceName\(\s*["']([\w.-]+)/i) ??
      match(snippet, /["']service\.name["']\s*:\s*["']([\w.-]+)/i),
  },
  {
    signal: 'sdk_config',
    source: 'app',
    query: 'spring.application.name service name configuration',
    extract: (snippet) => match(snippet, assign('spring\\.application\\.name')),
  },
  {
    signal: 'deployment_identity',
    source: 'iac',
    query: 'kubernetes deployment metadata name app.kubernetes.io/name label',
    extract: (snippet) =>
      match(snippet, /app\.kubernetes\.io\/name\s*[:=]\s*["']?([\w.-]+)/i) ??
      match(snippet, /\bname\s*:\s*["']?([\w.-]+)/i),
  },
];

function match(snippet: string, re: RegExp): string | undefined {
  const result = re.exec(snippet);
  return result?.[1];
}

/**
 * Runs the service-name matchers via SCS code search and returns de-duplicated
 * candidates. Each candidate carries a `code:` evidence line.
 */
export async function collectServiceNameCandidatesFromCode({
  repository,
  fingerprint,
  searchCode,
}: {
  repository: string;
  fingerprint: string | undefined;
  searchCode: (repository: string, query: string) => Promise<CodeHit[]>;
}): Promise<ServiceNameCandidate[]> {
  const ref = fingerprint ? `${repository}@${fingerprint}` : repository;
  const seen = new Set<string>();
  const candidates: ServiceNameCandidate[] = [];

  for (const matcher of SERVICE_NAME_MATCHERS) {
    const hits = await searchCode(repository, matcher.query);
    for (const hit of hits) {
      const extracted = matcher.extract(hit.snippet);
      if (!extracted) {
        continue;
      }
      const dedupeKey = `${matcher.signal}:${extracted.toLowerCase()}`;
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);
      const location = hit.line !== undefined ? `${hit.file}:${hit.line}` : hit.file;
      candidates.push({
        value: extracted,
        signal: matcher.signal,
        source: matcher.source,
        evidence: `code: ${ref}:${location} ${matcher.query}`,
      });
    }
  }

  return candidates;
}

/**
 * End-to-end service-name resolution: collect candidates from code (IaC + app)
 * and rank them against the `service.name` values observed in logs.
 */
export async function resolveServiceName({
  repository,
  fingerprint,
  searchCode,
  observedServiceNames,
}: {
  repository: string;
  fingerprint: string | undefined;
  searchCode: (repository: string, query: string) => Promise<CodeHit[]>;
  observedServiceNames: string[];
}): Promise<ServiceNameResolution | undefined> {
  const candidates = await collectServiceNameCandidatesFromCode({
    repository,
    fingerprint,
    searchCode,
  });
  return rankServiceName(candidates, observedServiceNames);
}

/** Cap on distinct services enumerated from a single repository. */
export const MAX_SERVICES_PER_REPOSITORY = 50;

// Signals that reliably denote a distinct service identity. Deployment-identity
// `name:` matches are too noisy to spawn a service on their own (a monorepo has
// many `name:` fields), so they only contribute evidence to a service already
// established by a primary signal.
const PRIMARY_SERVICE_SIGNALS: ReadonlySet<ServiceNameSignal> = new Set([
  'env_injection',
  'sdk_config',
]);

/**
 * Groups candidates by normalized service value and produces one resolution per
 * distinct service — for monorepos that deploy many services from one repo. Only
 * groups anchored by a primary signal (env injection / SDK config) become a
 * service; lower-signal matches (e.g. k8s `name:`) only enrich those.
 */
export function rankServiceNames(
  candidates: ServiceNameCandidate[],
  observedServiceNames: string[]
): ServiceNameResolution[] {
  const groups = new Map<string, ServiceNameCandidate[]>();
  for (const candidate of candidates) {
    const key = normalizeServiceName(candidate.value);
    if (key.length === 0) {
      continue;
    }
    const group = groups.get(key) ?? [];
    group.push(candidate);
    groups.set(key, group);
  }

  const resolutions: ServiceNameResolution[] = [];
  const seenValues = new Set<string>();
  for (const group of groups.values()) {
    if (!group.some((candidate) => PRIMARY_SERVICE_SIGNALS.has(candidate.signal))) {
      continue;
    }
    const resolution = rankServiceName(group, observedServiceNames);
    if (!resolution) {
      continue;
    }
    const dedupeKey = resolution.value.trim().toLowerCase();
    if (seenValues.has(dedupeKey)) {
      continue;
    }
    seenValues.add(dedupeKey);
    resolutions.push(resolution);
  }

  return resolutions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_SERVICES_PER_REPOSITORY);
}

/**
 * End-to-end multi-service resolution for a repository: collect code candidates
 * and return one resolution per distinct detected service.
 */
export async function resolveServiceNames({
  repository,
  fingerprint,
  searchCode,
  observedServiceNames,
}: {
  repository: string;
  fingerprint: string | undefined;
  searchCode: (repository: string, query: string) => Promise<CodeHit[]>;
  observedServiceNames: string[];
}): Promise<ServiceNameResolution[]> {
  const candidates = await collectServiceNameCandidatesFromCode({
    repository,
    fingerprint,
    searchCode,
  });
  return rankServiceNames(candidates, observedServiceNames);
}
