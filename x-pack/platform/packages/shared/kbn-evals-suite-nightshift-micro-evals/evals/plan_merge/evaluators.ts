/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { renderPrompt, promptVersion, toolSchema } from '../../src/prompt';
import { ratingSchema, ratingResponseSchema, gradeRating } from '../../src/judge';
import { CONFLICT_USER, MUTATION_USER, SPEC_TEMPLATE } from './judge_prompt';
import { pythonList, pythonRound, pythonSlice } from '../../src/python';
import type { PlanMergeEvaluator, PlanMergeOutput } from './types';

const mergedMermaid = (output: PlanMergeOutput): string =>
  (output.merged_mermaid || output.decision_tree_mermaid || '').trim();
const takenTerminals = (mermaid: string): string[] => {
  const terminals = new Set<string>();
  for (const line of mermaid.split(/\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/)) {
    if (!line.includes('✅') || !line.includes('-->')) continue;
    const match = line.match(/-->\s*\|.*?\|\s*([SEDX]\d+[A-Za-z]*)/);
    if (match?.[1].startsWith('X')) terminals.add(match[1]);
  }
  return [...terminals].sort();
};

export const codeEvaluators: PlanMergeEvaluator[] = [
  {
    name: 'structural_validity',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output }) => {
      const mermaid = mergedMermaid(output);
      if (!mermaid) return { score: 0, explanation: 'empty output' };
      const checks: Array<[string, boolean]> = [
        ['flowchart_td', mermaid.trimStart().startsWith('flowchart TD')],
        ['no_styling', !/\b(linkStyle|classDef|style)\b/i.test(mermaid)],
        ['has_symptom_S', /\bS\d+\s*\(\[/.test(mermaid)],
        ['has_evidence_E', /\bE\d+\s*\[/.test(mermaid)],
        ['has_terminal_X', /\bX\d+\s*\(\(/.test(mermaid)],
        ['has_taken_path', /-->\s*\|["']?✅/.test(mermaid)],
      ];
      const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
      return {
        score: pythonRound((checks.length - failures.length) / checks.length),
        explanation: failures.length ? `failed: ${failures.join(', ')}` : 'ok',
      };
    },
  },
  {
    name: 'mutation_preservation',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output, expected }) => {
      const mermaid = mergedMermaid(output);
      if (!mermaid) return { score: 0, explanation: 'empty output' };
      const spec = expected.mutation_spec ?? {};
      const actualIds = new Set(
        [...mermaid.matchAll(/\b([SEDX]\d+[A-Za-z]*)\b/g)].map((match) => match[1])
      );
      const issues: string[] = [];
      let checks = 0;
      for (const id of spec.preserved_node_ids ?? []) {
        checks++;
        if (!actualIds.has(id)) issues.push(`missing preserved node ${id}`);
      }
      for (const id of spec.nodes_added ?? []) {
        checks++;
        if (!actualIds.has(id)) issues.push(`added node ${id} not found`);
      }
      for (const id of spec.nodes_deleted ?? []) {
        checks++;
        if (actualIds.has(id)) issues.push(`deleted node ${id} still present`);
      }
      if (!checks) return { score: 1, explanation: 'no spec' };
      return {
        score: pythonRound((checks - issues.length) / checks),
        explanation: issues.length ? issues.join('; ') : `all ${checks} checks passed`,
      };
    },
  },
  {
    name: 'checkmark_placement',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output, expected }) => {
      const mermaid = mergedMermaid(output);
      const spec = expected.mutation_spec ?? {};
      const correct = spec.correct_terminal || '';
      const wrong = spec.terminals_without_checkmark ?? [];
      if (!correct && !wrong.length) return { score: 1, explanation: 'no spec' };
      if (!mermaid) return { score: 0, explanation: 'empty output' };
      const taken = takenTerminals(mermaid);
      const checks: Array<[string, boolean]> = correct
        ? [[`✅→${correct}`, taken.includes(correct)]]
        : [];
      checks.push(...wrong.map((id): [string, boolean] => [`no-✅→${id}`, !taken.includes(id)]));
      const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
      return {
        score: checks.length ? pythonRound((checks.length - failures.length) / checks.length) : 1,
        explanation: failures.length ? `failed: ${pythonList(failures)}` : 'ok',
      };
    },
  },
];

const conflictSchema = z.object({ conflict: z.boolean(), reason: z.string() });

/** Creates the merge evaluators with the run's selected judge connector. */
export const createEvaluators = (
  inferenceClient: Pick<BoundInferenceClient, 'output'>
): PlanMergeEvaluator[] => [
  ...codeEvaluators,
  {
    name: 'no_conflicting_checkmarks',
    kind: 'LLM',
    direction: 'maximize',
    getVersion: () => promptVersion(CONFLICT_USER),
    evaluate: async ({ output }) => {
      const mermaid = mergedMermaid(output);
      if (!mermaid) return { score: 0, explanation: 'empty output' };
      const taken = takenTerminals(mermaid);
      if (taken.length <= 1)
        return {
          score: 1,
          explanation: `single ✅ terminal: ${pythonList(taken.length ? taken : ['none'])}`,
        };
      try {
        const response = await inferenceClient.output({
          id: 'no_conflicting_checkmarks',
          input: renderPrompt(CONFLICT_USER, {
            taken_x: pythonList(taken),
            'mermaid[:3000]': pythonSlice(mermaid, 3000),
          }),
          schema: toolSchema(conflictSchema),
        });
        const parsed = conflictSchema.partial().parse(response.output ?? {});
        return {
          score: parsed.conflict ? 0 : 1,
          explanation: `conflict=${parsed.conflict ? 'yes' : 'no'} (${pythonList(taken)}) — ${
            parsed.reason ?? ''
          }`,
        };
      } catch (error) {
        return {
          score: 0.5,
          explanation: `judge unavailable: ${
            error instanceof Error ? error.message : String(error)
          }; ${taken.length} ✅ terminals: ${pythonList(taken)}`,
        };
      }
    },
  },
  {
    name: 'mutation_correctness',
    kind: 'LLM',
    direction: 'maximize',
    getVersion: () => promptVersion(MUTATION_USER, SPEC_TEMPLATE),
    evaluate: async ({ input, output, expected }) => {
      const mermaid = mergedMermaid(output);
      if (!mermaid) return { score: 0, explanation: 'empty output' };
      const reference = (expected.expected_merged_mermaid || '').trim();
      const spec = expected.mutation_spec ?? {};
      const summary = renderPrompt(SPEC_TEMPLATE, {
        "spec.get('nodes_added', [])":
          spec.nodes_added === null ? 'None' : pythonList(spec.nodes_added ?? []),
        "spec.get('nodes_deleted', [])":
          spec.nodes_deleted === null ? 'None' : pythonList(spec.nodes_deleted ?? []),
        "spec.get('correct_terminal', '')":
          spec.correct_terminal === null ? 'None' : spec.correct_terminal ?? '',
        "spec.get('terminals_without_checkmark', [])":
          spec.terminals_without_checkmark === null
            ? 'None'
            : pythonList(spec.terminals_without_checkmark ?? []),
        "spec.get('preserved_node_ids', [])":
          spec.preserved_node_ids === null ? 'None' : pythonList(spec.preserved_node_ids ?? []),
      });
      try {
        const response = await inferenceClient.output({
          id: 'mutation_correctness',
          input: renderPrompt(MUTATION_USER, {
            causal_summary: input.causal_summary || '',
            spec_summary: summary,
            'initial_tree[:1500]': pythonSlice(input.initial_tree_mermaid || '', 1500),
            "expected[:1200] if expected else '(not provided)'": reference
              ? pythonSlice(reference, 1200)
              : '(not provided)',
            'mermaid[:2000]': pythonSlice(mermaid, 2000),
          }),
          schema: toolSchema(ratingSchema),
        });
        return gradeRating(ratingResponseSchema.parse(response.output ?? {}));
      } catch (error) {
        return {
          score: 0,
          explanation: `judge failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  },
];
