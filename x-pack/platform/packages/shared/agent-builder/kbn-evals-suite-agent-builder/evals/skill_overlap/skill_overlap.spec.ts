/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import type { EvaluationReporter, Example, ExperimentTask, RanExperiment } from '@kbn/evals';
import { selectEvaluators } from '@kbn/evals';
import type { HttpHandler } from '@kbn/core/public';
import type { SomeDevLog } from '@kbn/some-dev-log';
import { table } from 'table';
import chalk from 'chalk';
import { tags } from '@kbn/scout';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { evaluate as base } from '../../src/evaluate';

interface SkillSummary {
  id: string;
  name: string;
  description: string;
  tool_ids: string[];
  readonly: boolean;
  experimental: boolean;
}

interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  content: string;
  referenced_content?: Array<{ name: string; relativePath: string; content: string }>;
  tool_ids: string[];
  readonly: boolean;
  experimental: boolean;
}

type SkillCatalog = Map<string, SkillDefinition>;

async function enableExperimentalSkills(fetch: HttpHandler, log: SomeDevLog): Promise<boolean> {
  try {
    await fetch(`/api/kibana/settings/${AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID}`, {
      method: 'POST',
      body: JSON.stringify({ value: true }),
    });
    log.info('Enabled agentBuilder:experimentalFeatures for skill visibility');
    return true;
  } catch {
    log.info('agentBuilder:experimentalFeatures is overridden in kibana.yml — skipping');
    return false;
  }
}

async function restoreExperimentalSkills(fetch: HttpHandler, log: SomeDevLog): Promise<void> {
  try {
    await fetch(`/api/kibana/settings/${AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID}`, {
      method: 'DELETE',
    });
    log.info('Restored agentBuilder:experimentalFeatures to default');
  } catch {
    log.warning('Failed to restore agentBuilder:experimentalFeatures');
  }
}

async function loadAllSkills(fetch: HttpHandler, log: SomeDevLog): Promise<SkillCatalog> {
  log.info('Loading all skill definitions from the agent builder API');

  const { results: summaries } = (await fetch('/api/agent_builder/skills', {
    method: 'GET',
    version: '2023-10-31',
    query: { include_plugins: true },
  })) as { results: SkillSummary[] };

  log.info(`Found ${summaries.length} skills, fetching full definitions`);

  const catalog: SkillCatalog = new Map();

  const settled = await Promise.allSettled(
    summaries.map(async (summary) => {
      const skill = (await fetch(`/api/agent_builder/skills/${encodeURIComponent(summary.id)}`, {
        method: 'GET',
        version: '2023-10-31',
      })) as SkillDefinition;
      return skill;
    })
  );

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      catalog.set(result.value.id, result.value);
    }
  }

  log.info(`Loaded ${catalog.size} skill definitions`);
  return catalog;
}

function generateAllPairs(catalog: SkillCatalog): PairwiseExample[] {
  const ids = [...catalog.keys()].sort();
  const pairs: PairwiseExample[] = [];

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      pairs.push({
        input: { skillIdA: ids[i], skillIdB: ids[j] },
        output: {},
      });
    }
  }

  return pairs;
}

const PAIRWISE_ANALYSIS_SYSTEM = `You are a quality assurance analyst for an LLM agent's skill routing system.

The agent has access to multiple "skills" — specialized instruction sets that guide it through domain-specific tasks. The agent decides which skill to load based ONLY on the skill's short "description" field. After loading, it follows the skill's full "content" instructions.

Your job: analyze two skills for overlap in their descriptions that could cause the agent to load the WRONG skill for a given user request.

Focus on:
1. DESCRIPTION OVERLAP: Shared trigger phrases, keywords, or intent patterns in the descriptions that would match the same user messages
2. AMBIGUOUS USER MESSAGES: Concrete example user messages that could reasonably activate either skill
3. NEGATIVE GUIDANCE GAPS: Whether either skill explicitly says "Do NOT use for..." to exclude the other's domain — and whether such guidance is missing
4. CONTENT-LEVEL DOMAIN INVASION: Whether one skill's full content claims territory that belongs to the other (e.g., listing examples or workflows from the other's domain)

Return your analysis as valid JSON with this exact structure:
{
  "risk_level": "HIGH" | "MEDIUM" | "LOW" | "NONE",
  "overlapping_triggers": ["trigger phrase 1", "trigger phrase 2"],
  "ambiguous_user_messages": ["example user message 1", "example user message 2"],
  "negative_guidance_gaps": "description of what Do-NOT-use clauses are missing, or empty string if none",
  "overlap_description": "detailed explanation of the overlap and why it causes confusion, or why there is no overlap",
  "recommendations": ["specific actionable fix 1", "specific actionable fix 2"]
}

Risk level definitions:
- HIGH: User messages in the primary domain of one skill would regularly trigger the other. No negative guidance exists. This is a routing defect that must be fixed.
- MEDIUM: Some user messages could plausibly trigger either skill. Partial negative guidance exists or overlap is limited to edge cases.
- LOW: Overlap exists only in uncommon edge cases or is well-mitigated by clear negative guidance.
- NONE: Descriptions are clearly distinct with no realistic routing confusion.

Be rigorous. Only rate HIGH when there is genuine, frequent routing confusion — not just thematic similarity between skills in the same domain.`;

function buildPairwisePrompt(skillA: SkillDefinition, skillB: SkillDefinition): string {
  const truncate = (text: string, maxLen: number) =>
    text.length > maxLen ? text.slice(0, maxLen) + '\n[... truncated ...]' : text;

  return `## Skill A: ${skillA.name} (id: ${skillA.id})

### Description (what the agent sees to decide whether to load this skill)
${skillA.description}

### Full Content (instructions loaded after selection)
${truncate(skillA.content, 6000)}

---

## Skill B: ${skillB.name} (id: ${skillB.id})

### Description (what the agent sees to decide whether to load this skill)
${skillB.description}

### Full Content (instructions loaded after selection)
${truncate(skillB.content, 6000)}

---

Analyze these two skills for routing overlap. Return ONLY valid JSON.`;
}

interface PairwiseAnalysisOutput {
  risk_level: string;
  overlapping_triggers: string[];
  ambiguous_user_messages: string[];
  negative_guidance_gaps: string;
  overlap_description: string;
  recommendations: string[];
  raw_response: string;
  parse_error?: string;
}

type PairwiseExample = Example<
  { skillIdA: string; skillIdB: string },
  Record<string, never>,
  Record<string, never>
>;

function tryParseJson<T>(raw: string): { parsed: T | null; error?: string } {
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/);
  const toParse = jsonMatch?.[1]?.trim() ?? raw.trim();
  try {
    return { parsed: JSON.parse(toParse) as T };
  } catch (e) {
    return { parsed: null, error: `Failed to parse JSON: ${e}` };
  }
}

async function callLlm(
  inferenceClient: BoundInferenceClient,
  system: string,
  input: string
): Promise<string> {
  const response = await inferenceClient.output({
    id: 'skill-overlap-analysis',
    system,
    input,
  });
  return response.content;
}

function createPairwiseTask({
  skillCatalog,
  inferenceClient,
  log,
}: {
  skillCatalog: SkillCatalog;
  inferenceClient: BoundInferenceClient;
  log: SomeDevLog;
}): ExperimentTask<PairwiseExample, PairwiseAnalysisOutput> {
  return async ({ input }) => {
    const { skillIdA, skillIdB } = input!;
    const skillA = skillCatalog.get(skillIdA);
    const skillB = skillCatalog.get(skillIdB);

    if (!skillA || !skillB) {
      const missing = [!skillA ? skillIdA : null, !skillB ? skillIdB : null].filter(Boolean);
      log.warning(`Skipping pair: skills not found: ${missing.join(', ')}`);
      return {
        risk_level: 'UNAVAILABLE',
        overlapping_triggers: [],
        ambiguous_user_messages: [],
        negative_guidance_gaps: '',
        overlap_description: 'Skills not registered in this deployment.',
        recommendations: [],
        raw_response: '',
      };
    }

    const prompt = buildPairwisePrompt(skillA, skillB);
    const raw = await callLlm(inferenceClient, PAIRWISE_ANALYSIS_SYSTEM, prompt);
    const { parsed, error } = tryParseJson<Omit<PairwiseAnalysisOutput, 'raw_response'>>(raw);

    if (!parsed) {
      return {
        risk_level: 'PARSE_ERROR',
        overlapping_triggers: [],
        ambiguous_user_messages: [],
        negative_guidance_gaps: '',
        overlap_description: '',
        recommendations: [],
        raw_response: raw,
        parse_error: error,
      };
    }

    return { ...parsed, raw_response: raw };
  };
}

/**
 * Pairwise evaluators — these check the current state of skills in the codebase.
 * A HIGH risk_level means the two skill descriptions have a routing defect.
 * The eval FAILS when overlaps are found, PASSES when descriptions are clean.
 */
function createPairwiseEvaluators() {
  return selectEvaluators<PairwiseExample, PairwiseAnalysisOutput>([
    {
      name: 'StructuredOutput',
      kind: 'CODE',
      evaluate: async ({ output }) => {
        if (!output || output.risk_level === 'UNAVAILABLE') {
          return { score: null, label: 'skipped', explanation: 'Skills not available' };
        }
        if (output.parse_error) {
          return { score: 0, metadata: { error: output.parse_error } };
        }

        const validRiskLevels = ['HIGH', 'MEDIUM', 'LOW', 'NONE'];
        const hasValidRisk = validRiskLevels.includes(output.risk_level);
        const hasDescription =
          typeof output.overlap_description === 'string' && output.overlap_description.length > 10;
        const hasTriggers = Array.isArray(output.overlapping_triggers);
        const hasRecommendations = Array.isArray(output.recommendations);

        const checks = [hasValidRisk, hasDescription, hasTriggers, hasRecommendations];
        const passed = checks.filter(Boolean).length;

        return {
          score: passed / checks.length,
          metadata: { hasValidRisk, hasDescription, hasTriggers, hasRecommendations },
        };
      },
    },
    {
      name: 'NoHighRiskOverlap',
      kind: 'CODE',
      evaluate: async ({ output, input }) => {
        if (!output || output.risk_level === 'UNAVAILABLE') {
          return { score: null, label: 'skipped' };
        }

        if (output.risk_level === 'HIGH') {
          return {
            score: 0,
            label: 'HIGH_RISK',
            explanation: `${input?.skillIdA} <-> ${input?.skillIdB}: ${output.overlap_description}`,
          };
        }

        return { score: 1, label: output.risk_level };
      },
    },
  ]);
}

interface SkillConflictProfile {
  high: number;
  medium: number;
  low: number;
  worst: string;
  conflicts: Array<{ other: string; level: string }>;
}

const SEVERITY_RANK: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

function colorRisk(level: string): string {
  if (level === 'HIGH') return chalk.bold.red(level);
  if (level === 'MEDIUM') return chalk.yellow(level);
  if (level === 'LOW') return chalk.green(level);
  return chalk.gray(level);
}

function printPairwiseReport(
  experiment: RanExperiment,
  skillCatalog: SkillCatalog,
  log: SomeDevLog
): void {
  const runs = Object.values(experiment.runs);
  const profiles = new Map<string, SkillConflictProfile>();

  const emptyProfile = (): SkillConflictProfile => ({
    high: 0,
    medium: 0,
    low: 0,
    worst: '-',
    conflicts: [],
  });

  for (const skillId of skillCatalog.keys()) {
    profiles.set(skillId, emptyProfile());
  }

  for (const run of runs) {
    const output = run.output as PairwiseAnalysisOutput;
    const input = run.input ?? {};
    const level = output?.risk_level;
    if (!level || level === 'NONE' || level === 'UNAVAILABLE' || level === 'PARSE_ERROR') continue;

    const skillA = input.skillIdA as string;
    const skillB = input.skillIdB as string;
    const key = level === 'HIGH' ? 'high' : level === 'MEDIUM' ? 'medium' : 'low';

    for (const [id, other] of [
      [skillA, skillB],
      [skillB, skillA],
    ] as const) {
      if (!profiles.has(id)) {
        profiles.set(id, emptyProfile());
      }
      const p = profiles.get(id)!;
      p[key]++;
      p.conflicts.push({ other, level });
      if (p.worst === '-' || (SEVERITY_RANK[level] ?? 99) < (SEVERITY_RANK[p.worst] ?? 99)) {
        p.worst = level;
      }
    }
  }

  const sorted = [...profiles.entries()].sort(([a], [b]) => a.localeCompare(b));

  const details: string[] = [];

  for (const level of ['HIGH', 'MEDIUM'] as const) {
    const pairsAtLevel = runs.filter(
      (r) => (r.output as PairwiseAnalysisOutput)?.risk_level === level
    );
    if (pairsAtLevel.length === 0) continue;

    const plural = pairsAtLevel.length > 1 ? 's' : '';
    details.push(`${colorRisk(level)} RISK DETAILS (${pairsAtLevel.length} pair${plural}):`);
    details.push('');

    for (const run of pairsAtLevel) {
      const output = run.output as PairwiseAnalysisOutput;
      const input = run.input ?? {};
      const idA = String(input.skillIdA);
      const idB = String(input.skillIdB);
      const tagA = skillCatalog.get(idA)?.experimental ? chalk.magenta(' [exp]') : '';
      const tagB = skillCatalog.get(idB)?.experimental ? chalk.magenta(' [exp]') : '';
      const labelA = chalk.bold.white(idA) + tagA;
      const labelB = chalk.bold.white(idB) + tagB;
      details.push(`  [${colorRisk(level)}] ${labelA} ${chalk.gray('<->')} ${labelB}`);
      if (output.overlapping_triggers?.length > 0) {
        const triggers = output.overlapping_triggers.map((t) => chalk.cyan(`"${t}"`)).join(', ');
        details.push(`    ${chalk.dim('Triggers:')} ${triggers}`);
      }
      if (output.ambiguous_user_messages?.length > 0) {
        for (const msg of output.ambiguous_user_messages) {
          details.push(`    ${chalk.dim('Ambiguous:')} ${chalk.italic(`"${msg}"`)}`);
        }
      }
      if (output.negative_guidance_gaps) {
        details.push(
          `    ${chalk.dim('Missing guidance:')} ${chalk.yellow(output.negative_guidance_gaps)}`
        );
      }
      if (output.recommendations?.length > 0) {
        for (const rec of output.recommendations) {
          details.push(`    ${chalk.dim('Fix:')} ${chalk.green(rec)}`);
        }
      }
      details.push('');
    }
  }

  const totalHigh = runs.filter(
    (r) => (r.output as PairwiseAnalysisOutput)?.risk_level === 'HIGH'
  ).length;
  const totalMed = runs.filter(
    (r) => (r.output as PairwiseAnalysisOutput)?.risk_level === 'MEDIUM'
  ).length;
  const totalLow = runs.filter(
    (r) => (r.output as PairwiseAnalysisOutput)?.risk_level === 'LOW'
  ).length;
  const skillsWithIssues = sorted.filter(([, p]) => p.worst !== '-').length;

  const formatConflicts = (conflicts: SkillConflictProfile['conflicts']): string => {
    if (conflicts.length === 0) return chalk.gray('-');
    const highAndMed = conflicts
      .filter((c) => c.level === 'HIGH' || c.level === 'MEDIUM')
      .sort((a, b) => a.other.localeCompare(b.other));
    if (highAndMed.length === 0) {
      return chalk.gray(`${conflicts.length} low`);
    }
    return highAndMed
      .map((c) => {
        const exp = skillCatalog.get(c.other)?.experimental ? chalk.magenta(' [exp]') : '';
        return `${c.other}${exp} (${colorRisk(c.level)})`;
      })
      .join('\n');
  };

  const skillLabel = (id: string, color?: (s: string) => string) => {
    const name = color ? color(id) : id;
    return skillCatalog.get(id)?.experimental ? `${name} ${chalk.magenta('[exp]')}` : name;
  };

  const tableHeaders = ['Skill', 'HIGH', 'MED', 'LOW', 'Conflicts'].map((h) => chalk.bold(h));
  const tableRows = sorted.map(([id, p]) => {
    const color = p.worst === 'HIGH' ? chalk.red : p.worst === 'MEDIUM' ? chalk.yellow : undefined;
    return [
      skillLabel(id, color),
      p.high > 0 ? chalk.bold.red(String(p.high)) : chalk.gray(String(p.high)),
      p.medium > 0 ? chalk.yellow(String(p.medium)) : chalk.gray(String(p.medium)),
      p.low > 0 ? chalk.green(String(p.low)) : chalk.gray(String(p.low)),
      formatConflicts(p.conflicts),
    ];
  });
  const summaryRow = [
    chalk.bold('Total pairs'),
    chalk.bold.red(String(totalHigh)),
    chalk.bold.yellow(String(totalMed)),
    chalk.bold.green(String(totalLow)),
    `${skillsWithIssues}/${profiles.size} skills affected`,
  ];

  const summaryTable = table([tableHeaders, ...tableRows, summaryRow], {
    columns: {
      0: { alignment: 'left' },
      1: { alignment: 'right' },
      2: { alignment: 'right' },
      3: { alignment: 'right' },
      4: { alignment: 'left' },
    },
  });

  if (details.length > 0) {
    log.info(`\n${details.join('\n')}`);
  }
  log.info(`\n${chalk.bold.blue('═══ SKILL OVERLAP RESULTS ═══')}\n${summaryTable}`);
}

const evaluate = base.extend<
  {},
  {
    skillCatalog: SkillCatalog;
  }
>({
  skillCatalog: [
    async ({ fetch, log }, use) => {
      const wasEnabled = await enableExperimentalSkills(fetch, log);
      const catalog = await loadAllSkills(fetch, log);
      await use(catalog);
      if (wasEnabled) {
        await restoreExperimentalSkills(fetch, log);
      }
    },
    { scope: 'worker' },
  ],
  reportModelScore: [
    async ({}, use: (r: EvaluationReporter) => Promise<void>) => {
      await use(async () => {});
    },
    { scope: 'worker' },
  ],
});

evaluate.describe('Skill Overlap - Pairwise Analysis', { tag: tags.stateful.classic }, () => {
  evaluate.beforeEach(async ({ evaluationConnector, connector }, testInfo) => {
    if (connector.id !== evaluationConnector.id) {
      testInfo.skip(true, 'Skill overlap only needs to run once (using the judge model)');
    }
  });

  evaluate(
    'no skill pair has high-risk description overlap',
    async ({ executorClient, inferenceClient, skillCatalog, log }) => {
      const pairs = generateAllPairs(skillCatalog);
      log.info(`Generated ${pairs.length} skill pairs from ${skillCatalog.size} skills`);

      const task = createPairwiseTask({ skillCatalog, inferenceClient, log });

      const experiment = await executorClient.runExperiment(
        {
          dataset: {
            name: 'agent-builder: skill-overlap-pairwise',
            description:
              'Checks every pair of registered skills for description overlap that could cause incorrect skill routing',
            examples: pairs,
          },
          task,
          concurrency: 10,
        },
        createPairwiseEvaluators()
      );

      printPairwiseReport(experiment, skillCatalog, log);
    }
  );
});
