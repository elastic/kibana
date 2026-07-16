/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ScoreIngestResultCounts {
  ingested: number;
  conflicted: number;
  failed: Array<{ reason?: string }>;
}

export function isGoldenScoreIngestConfigured(
  evaluationsKbnUrl: string | undefined = process.env.EVALUATIONS_KBN_URL
): boolean {
  return Boolean(evaluationsKbnUrl?.trim());
}

export function describeScoreIngestTargetHost(
  evaluationsKbnUrl: string | undefined = process.env.EVALUATIONS_KBN_URL
): string {
  const url = evaluationsKbnUrl?.trim();
  if (!url) {
    return 'local Scout Kibana (EVALUATIONS_KBN_URL unset — scores stay on ephemeral CI ES)';
  }

  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function shouldEnforceGoldenScoreIngest(): boolean {
  return process.env.KBN_EVALS === '1' || process.env.BUILDKITE === 'true';
}

export function assertScoreIngestLanded(
  results: ScoreIngestResultCounts[],
  options?: { enforce?: boolean }
): void {
  if (results.length === 0) {
    return;
  }

  const ingested = results.reduce((sum, result) => sum + result.ingested, 0);
  const conflicted = results.reduce((sum, result) => sum + result.conflicted, 0);
  const failed = results.reduce((sum, result) => sum + result.failed.length, 0);

  if (ingested > 0 || failed > 0 || conflicted > 0) {
    return;
  }

  const enforce = options?.enforce ?? shouldEnforceGoldenScoreIngest();
  if (!enforce) {
    return;
  }

  throw new Error(
    'Score ingest returned no landed documents (ingested=0, conflicted=0, failed=0). ' +
      'Scores likely never reached the golden cluster — check EVALUATIONS_KBN_URL/API_KEY and golden evals plugin config.'
  );
}
