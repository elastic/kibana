/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFlattenedObject } from '@kbn/std';
import type { KIQueryGenerationEvaluator } from '../types';
import { getQueriesFromOutput } from '../types';
import { isEvidenceGrounded } from '../../ki_feature_extraction/evidence/is_evidence_grounded';
import { matchesEvidenceText } from '../../common/matches_evidence_text';

/**
 * Strips LLM-added annotations and wrapping quotes from evidence strings.
 *
 * LLMs often append contextual annotations to evidence, e.g.:
 *   `attributes.msg: "Charge request received." (4% of sampled logs)`
 *   `body.text: "payment went through..." — normal path; absence signals failure`
 *
 * They also wrap values in quotes (`key: "value"`), which prevents
 * `isEvidenceGrounded`'s key-value matching from succeeding because the parsed
 * value retains the surrounding quotes.
 */
function stripEvidenceAnnotations(evidence: string): string {
  let cleaned = evidence
    // Remove trailing parenthetical annotations, e.g. "(4% of sampled logs)"
    .replace(/\s*\([^)]*\)\s*$/, '')
    // Remove trailing em-dash/en-dash commentary, e.g. "— normal path; absence signals failure"
    .replace(/\s*[—–]\s+.*$/, '')
    .trimEnd();

  // Unwrap quoted values in key-value pairs: `key: "value"` → `key: value`
  cleaned = cleaned.replace(/^([^:=]+[=:]\s*)"(.*)"$/, '$1$2');

  return cleaned;
}

/**
 * Returns true for tokens that look like technical identifiers rather
 * than natural-language prose: dotted field paths, camelCase names,
 * tokens with digits, ALL_CAPS error codes, or hyphenated compound
 * identifiers (e.g. otel-collector, product-catalog). No stop-words
 * list required - the structural heuristics are dataset-agnostic.
 */
function isTechnicalToken(token: string): boolean {
  if (token.length <= 3) return false;
  if (token.includes('.')) return true;
  if (/[a-z][A-Z]/.test(token)) return true;
  if (/\d/.test(token)) return true;
  if (token === token.toUpperCase() && /[A-Z]/.test(token)) return true;
  if (token.includes('-')) return true;
  return false;
}

/**
 * Keyword-overlap fallback for descriptive evidence. When the model
 * describes patterns ("body.text contains creditCardNumber") instead
 * of quoting exact values, extract technical tokens and verify that
 * the majority appear in the sample doc keys or values.
 */
interface KeywordGroundingResult {
  grounded: boolean;
  technicalTokens: string[];
  matchedTokens: string[];
  unmatchedTokens: string[];
}

function checkKeywordGrounding(
  evidence: string,
  flatDocs: Array<Record<string, unknown>>
): KeywordGroundingResult {
  // Split on whitespace and common punctuation/delimiters, then strip any
  // remaining non-identifier characters (keeping dots, hyphens, slashes, and @
  // which appear in field paths and email-like tokens).
  const tokens = evidence
    .split(/[\s,;:()[\]{}"'—–]+/)
    .map((t) => t.replace(/[^a-zA-Z0-9_.\-/@]/g, ''))
    .filter((t) => t.length > 0)
    .filter(isTechnicalToken);

  if (tokens.length === 0) {
    return { grounded: false, technicalTokens: [], matchedTokens: [], unmatchedTokens: [] };
  }

  const corpus: string[] = [];
  for (const doc of flatDocs) {
    for (const [key, val] of Object.entries(doc)) {
      corpus.push(key);
      if (typeof val === 'string') {
        corpus.push(val);
      }
    }
  }
  const corpusText = corpus.join('\n').toLowerCase();

  const matchedTokens = tokens.filter((t) => corpusText.includes(t.toLowerCase()));
  const unmatchedTokens = tokens.filter((t) => !corpusText.includes(t.toLowerCase()));

  return {
    grounded: matchedTokens.length / tokens.length >= 0.5,
    technicalTokens: tokens,
    matchedTokens,
    unmatchedTokens,
  };
}

/**
 * Serialize KI features into a searchable text corpus. Each feature's
 * type, title, description, confidence, properties, evidence, and meta
 * are joined so that both exact substring and keyword overlap matching
 * can verify feature-based evidence citations.
 */
function buildFeatureCorpus(features: unknown): string {
  if (!Array.isArray(features) || features.length === 0) return '';

  const lines: string[] = [];

  for (const f of features) {
    if (typeof f !== 'object' || f === null) continue;
    const feat = f as Record<string, unknown>;

    const parts: string[] = [];
    if (feat.type) parts.push(`${feat.type}`);
    if (feat.title) parts.push(`${feat.title}`);
    if (feat.description) parts.push(`${feat.description}`);
    if (typeof feat.confidence === 'number') parts.push(`confidence ${feat.confidence}`);

    if (feat.properties && typeof feat.properties === 'object') {
      const flat = getFlattenedObject(feat.properties as Record<string, unknown>);
      for (const [key, val] of Object.entries(flat)) {
        parts.push(key);
        if (val != null) parts.push(String(val));
      }
    }
    if (Array.isArray(feat.evidence)) {
      for (const ev of feat.evidence) {
        if (typeof ev === 'string') parts.push(ev);
      }
    }
    if (feat.meta && typeof feat.meta === 'object') {
      const flat = getFlattenedObject(feat.meta as Record<string, unknown>);
      for (const val of Object.values(flat)) {
        if (val != null) parts.push(String(val));
      }
    }
    if (feat.filter && typeof feat.filter === 'object') {
      const flat = getFlattenedObject(feat.filter as Record<string, unknown>);
      for (const [key, val] of Object.entries(flat)) {
        parts.push(key);
        if (val != null) parts.push(String(val));
      }
    }

    lines.push(parts.join(' '));
  }

  return lines.join('\n');
}

const FEATURE_NOISE_WORDS = new Set([
  'entity',
  'dependency',
  'technology',
  'infrastructure',
  'feature',
  'service',
  'confidence',
  'meta',
  'schema',
  'dataset',
  'the',
  'for',
  'and',
  'with',
  'from',
  'via',
]);

function isFeatureGrounded(evidence: string, featureCorpus: string): boolean {
  if (!featureCorpus) return false;
  const lower = featureCorpus.toLowerCase();
  const words = evidence
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s*[—–→]\s*/g, ' ')
    .replace(/[":]/g, ' ')
    .split(/\s+/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 1 && !FEATURE_NOISE_WORDS.has(w));

  if (words.length === 0) return false;

  const matched = words.filter((w) => lower.includes(w));
  return matched.length / words.length >= 0.6;
}

/**
 * Checks that every evidence string in every generated query is grounded
 * in the input data. Tries four strategies in order:
 *
 * 1. Exact grounding via `isEvidenceGrounded` (substring or key-value match
 *    against flattened `_source` docs).
 * 2. Keyword-overlap grounding: extracts technical tokens from the evidence
 *    and checks that the majority appear in doc keys or values.
 * 3. Feature grounding: checks whether the evidence cites KI features
 *    (entities, dependencies, technologies, etc.) from the input.
 * 4. Fallback to `sample_logs` text matching when no `sample_docs` exist.
 *
 * Returns `null` if no evidence strings are present across all queries.
 */
export const evidenceGroundingEvaluator: KIQueryGenerationEvaluator = {
  name: 'evidence_grounding',
  kind: 'CODE' as const,
  evaluate: async ({ input, output }) => {
    const queries = getQueriesFromOutput(output);
    const { sample_logs: sampleLogs, sample_docs: sampleDocs } = input;

    const flatDocs = sampleDocs?.map((doc) => getFlattenedObject(doc));
    const featureCorpus = buildFeatureCorpus(input.features);

    let totalEvidence = 0;
    let groundedEvidence = 0;
    const ungroundedItems: string[] = [];
    const debugLog: Array<{
      query: string;
      raw: string;
      stripped: string;
      exactMatch: boolean;
      keywordResult: KeywordGroundingResult | null;
      featureMatch: boolean;
      grounded: boolean;
    }> = [];

    for (const query of queries) {
      const evidence = query.evidence ?? [];
      if (evidence.length === 0) continue;

      for (const rawEv of evidence) {
        totalEvidence++;
        const ev = stripEvidenceAnnotations(rawEv);

        let grounded: boolean;
        let exactMatch = false;
        let keywordResult: KeywordGroundingResult | null = null;
        let featureMatch = false;

        if (flatDocs?.length) {
          exactMatch = isEvidenceGrounded(ev, flatDocs);
          if (!exactMatch) {
            keywordResult = checkKeywordGrounding(ev, flatDocs);
          }
          grounded = exactMatch || (keywordResult?.grounded ?? false);
        } else {
          grounded = sampleLogs.some((logLine) => matchesEvidenceText(logLine, ev));
        }

        if (!grounded) {
          featureMatch = isFeatureGrounded(ev, featureCorpus);
          grounded = featureMatch;
        }

        debugLog.push({
          query: query.title,
          raw: rawEv,
          stripped: ev !== rawEv ? ev : '(unchanged)',
          exactMatch,
          keywordResult,
          featureMatch,
          grounded,
        });

        if (grounded) {
          groundedEvidence++;
        } else {
          ungroundedItems.push(`"${query.title}": "${rawEv}"`);
        }
      }
    }

    if (totalEvidence === 0) {
      return { score: null, explanation: 'No evidence strings to check' };
    }

    const score = groundedEvidence / totalEvidence;

    return {
      score,
      explanation:
        ungroundedItems.length > 0
          ? `Evidence not found in sample docs or features: ${ungroundedItems
              .slice(0, 5)
              .join(', ')}`
          : `All ${totalEvidence} evidence strings are grounded in sample docs or features`,
      details: {
        totalEvidence,
        groundedEvidence,
        ungroundedItems,
        sampleDocCount: flatDocs?.length ?? 0,
        flatDocKeys: flatDocs?.length
          ? [...new Set(flatDocs.flatMap((d) => Object.keys(d)))].sort()
          : [],
        debugLog,
      },
    };
  },
};
