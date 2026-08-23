/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Judge provenance: who graded a cell, on what backend, and from which family.
 *
 * Two properties make a judged score trustworthy enough to rank on:
 *
 *  1. The judge ran on a known inference backend (EIS), not an ad-hoc
 *     locally-hosted endpoint whose weights/quantisation are unpinned.
 *  2. The judge is not scoring a candidate from its own model family, and
 *     above all is not scoring *itself*.
 *
 * Violations are reported, never silently corrected — a matrix that quietly
 * drops cells is worse than one that shows why a cell is untrustworthy.
 */

/** Model families we can recognise from a connector or model id. */
export type ModelFamily =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'meta'
  | 'mistral'
  | 'qwen'
  | 'deepseek'
  | 'nous'
  | 'unknown';

/**
 * Family patterns, most-specific first.
 *
 * `nous` precedes `meta` deliberately: `NousResearch/Hermes-3-Llama-3.1-70B`
 * names both vendors, and attributing it to Meta would overstate how much
 * cross-family coverage a judge panel actually has.
 */
const FAMILY_PATTERNS: Array<[ModelFamily, RegExp]> = [
  ['nous', /hermes|nousresearch/i],
  ['anthropic', /claude|anthropic/i],
  ['openai', /gpt|openai|o[13]-|oss/i],
  ['google', /gemini|google|gemma/i],
  ['mistral', /mistral|mixtral|magistral/i],
  ['qwen', /qwen/i],
  ['deepseek', /deepseek/i],
  ['meta', /llama|meta-/i],
];

export function classifyFamily(modelId: string | undefined | null): ModelFamily {
  const id = String(modelId ?? '');
  if (!id) {
    return 'unknown';
  }
  for (const [family, pattern] of FAMILY_PATTERNS) {
    if (pattern.test(id)) {
      return family;
    }
  }
  return 'unknown';
}

/**
 * EIS-backed connectors are registered with an `eis-` prefix. Anything else —
 * a raw provider id, a LiteLLM alias, a HuggingFace repo path — is a
 * self-hosted or third-party endpoint whose exact weights are not pinned by
 * the eval infrastructure.
 */
export function isEisBacked(judgeId: string | undefined | null): boolean {
  const id = String(judgeId ?? '').trim();
  if (!id) {
    return false;
  }
  if (/^eis[-_]/i.test(id)) {
    return true;
  }
  // Vendor-canonical ids used by EIS connectors, e.g. `anthropic-claude-4.6-sonnet`.
  return /^(anthropic|openai|google)-/i.test(id) && !id.includes('/');
}

export interface JudgeProvenance {
  judgeId: string;
  taskModelId: string;
  eisBacked: boolean;
  judgeFamily: ModelFamily;
  taskFamily: ModelFamily;
  /** Judge and candidate are literally the same model. */
  selfJudged: boolean;
  /** Judge and candidate come from the same model family. */
  sameFamily: boolean;
}

export function describeJudge(judgeId: string, taskModelId: string): JudgeProvenance {
  const judgeFamily = classifyFamily(judgeId);
  const taskFamily = classifyFamily(taskModelId);
  const norm = (s: string) =>
    String(s ?? '')
      .trim()
      .toLowerCase();
  return {
    judgeId,
    taskModelId,
    eisBacked: isEisBacked(judgeId),
    judgeFamily,
    taskFamily,
    selfJudged: norm(judgeId) === norm(taskModelId) && norm(judgeId) !== '',
    sameFamily: judgeFamily === taskFamily && judgeFamily !== 'unknown',
  };
}

export type JudgeViolationKind = 'non-eis-judge' | 'self-judged' | 'same-family';

export interface JudgeViolation {
  kind: JudgeViolationKind;
  judgeId: string;
  taskModelId: string;
  detail: string;
}

export interface JudgePolicy {
  /** Reject judges that are not EIS-backed. Default true. */
  requireEis?: boolean;
  /** Reject a model grading itself. Default true. */
  forbidSelfJudging?: boolean;
  /**
   * Reject a judge from the candidate's own family. Off by default: measured
   * same-family bias on the persona matrix was not statistically significant
   * (n=431 paired cells, z=-0.88), so this is opt-in rather than assumed.
   */
  forbidSameFamily?: boolean;
}

const DEFAULT_POLICY: Required<JudgePolicy> = {
  requireEis: true,
  forbidSelfJudging: true,
  forbidSameFamily: false,
};

/** Check one judge/candidate pairing against the policy. */
export function checkJudge(
  judgeId: string,
  taskModelId: string,
  policy: JudgePolicy = {}
): JudgeViolation[] {
  const effective = { ...DEFAULT_POLICY, ...policy };
  const p = describeJudge(judgeId, taskModelId);
  const violations: JudgeViolation[] = [];

  if (effective.requireEis && !p.eisBacked) {
    violations.push({
      kind: 'non-eis-judge',
      judgeId,
      taskModelId,
      detail: `judge "${judgeId}" is not an EIS-backed connector; its weights and quantisation are not pinned by the eval infrastructure`,
    });
  }
  if (effective.forbidSelfJudging && p.selfJudged) {
    violations.push({
      kind: 'self-judged',
      judgeId,
      taskModelId,
      detail: `model "${taskModelId}" graded its own output`,
    });
  }
  if (effective.forbidSameFamily && p.sameFamily) {
    violations.push({
      kind: 'same-family',
      judgeId,
      taskModelId,
      detail: `judge "${judgeId}" and candidate "${taskModelId}" are both in the "${p.judgeFamily}" family`,
    });
  }
  return violations;
}

export interface JudgeAuditRow {
  judgeId: string;
  taskModelId: string;
  docCount?: number;
}

export interface JudgeAuditSummary {
  totalDocs: number;
  nonEisDocs: number;
  selfJudgedDocs: number;
  sameFamilyDocs: number;
  violations: JudgeViolation[];
  /** Distinct judge families that graded at least one cell. */
  judgeFamilies: ModelFamily[];
}

/**
 * Audit a whole matrix worth of judge pairings so a report can state, up front,
 * how much of its data came from judges that meet the policy.
 */
export function auditJudges(rows: JudgeAuditRow[], policy: JudgePolicy = {}): JudgeAuditSummary {
  let totalDocs = 0;
  let nonEisDocs = 0;
  let selfJudgedDocs = 0;
  let sameFamilyDocs = 0;
  const violations: JudgeViolation[] = [];
  const seen = new Set<string>();
  const families = new Set<ModelFamily>();

  for (const row of rows) {
    const docs = row.docCount ?? 1;
    totalDocs += docs;
    const p = describeJudge(row.judgeId, row.taskModelId);
    families.add(p.judgeFamily);
    if (!p.eisBacked) {
      nonEisDocs += docs;
    }
    if (p.selfJudged) {
      selfJudgedDocs += docs;
    }
    if (p.sameFamily) {
      sameFamilyDocs += docs;
    }

    const key = `${row.judgeId}::${row.taskModelId}`;
    if (!seen.has(key)) {
      seen.add(key);
      violations.push(...checkJudge(row.judgeId, row.taskModelId, policy));
    }
  }

  return {
    totalDocs,
    nonEisDocs,
    selfJudgedDocs,
    sameFamilyDocs,
    violations,
    judgeFamilies: [...families].sort(),
  };
}
