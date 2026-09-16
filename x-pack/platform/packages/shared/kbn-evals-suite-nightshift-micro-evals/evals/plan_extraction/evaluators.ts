/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import { renderPrompt, promptVersion, toolSchema } from '../../src/prompt';
import { ratingSchema, ratingResponseSchema, gradeRating } from '../../src/judge';
import { QUALITY_SYSTEM, QUALITY_USER, EVOLVE_TEMPLATE } from './judge_prompt';
import { pythonBool, pythonFormat, pythonRound, pythonSlice } from '../../src/python';
import type { PlanExtractionEvaluator } from './types';

const stripFence = (mermaid: string): string => {
  let text = mermaid.trim();
  if (text.startsWith('```')) text = text.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
  return text.trim();
};

const labels = (mermaid: string): string[] => {
  const result: string[] = [];
  for (const match of mermaid.matchAll(
    /\w+\s*(?:\(\([^)]+\)\)|\(\[[^\]]+\]\)|\{[^}]+\}|\[[^\]]+\])/g
  )) {
    const inner = match[0].match(/[\(\[\{](.+?)[\)\]\}]/);
    if (!inner) continue;
    const label = inner[1]
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();
    if (label.length > 8) result.push(label);
  }
  return result;
};

const fuzzyIn = (needle: string, haystack: string[]): boolean => {
  const words = needle.split(/\s+/);
  if (words.length < 3) return haystack.join(' ').includes(needle);
  for (let index = 0; index <= words.length - 3; index++) {
    const fragment = words.slice(index, index + 3).join(' ');
    if (haystack.some((label) => label.includes(fragment))) return true;
  }
  return false;
};

export const codeEvaluators: PlanExtractionEvaluator[] = [
  {
    name: 'structural_validity',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output }) => {
      const mermaid = stripFence(output.decision_tree_mermaid || '');
      if (!mermaid) return { score: 0, explanation: 'empty output' };
      const checks: Array<[string, boolean]> = [
        ['starts_with_flowchart_td', mermaid.trimStart().startsWith('flowchart TD')],
        ['no_styling_directives', !/\b(linkStyle|classDef|style)\b/i.test(mermaid)],
        ['has_symptom_node', /\bS\d+\s*\(\[/.test(mermaid)],
        ['has_evidence_gatherer', /\bE\d+\s*\[/.test(mermaid)],
        ['has_end_node', /\bX\d+\s*\(\(/.test(mermaid)],
        ['has_taken_path_edges', /-->\|["']?✅/.test(mermaid)],
      ];
      const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
      return {
        score: pythonRound((checks.length - failures.length) / checks.length),
        explanation: failures.length ? `failed: ${failures.join(', ')}` : 'all checks passed',
      };
    },
  },
  {
    name: 'taken_path_coverage',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output }) => {
      const mermaid = stripFence(output.decision_tree_mermaid || '');
      if (!mermaid) return { score: 0, explanation: 'empty output' };
      const taken = new Map<string, [string, string]>();
      const all = new Set<string>();
      for (const line of mermaid.split(/\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/)) {
        if (!line.includes('-->')) continue;
        const takenMatch = line.match(/(\w+)[^>]*-->\|[^|]*\u2705[^|]*\|\s*(\w+)/);
        const allMatch = line.match(/(\w+).*-->\s*(?:\|[^|]*\|\s*)?(\w+)/);
        if (takenMatch)
          taken.set(JSON.stringify([takenMatch[1], takenMatch[2]]), [takenMatch[1], takenMatch[2]]);
        if (allMatch) all.add(JSON.stringify([allMatch[1], allMatch[2]]));
      }
      if (!all.size) return { score: 0, explanation: 'no edges parsed' };
      if (!taken.size) return { score: 0, explanation: 'no taken edges found' };
      const pairs = [...taken.values()];
      const sources = [...new Set(pairs.map(([source]) => source))];
      const fromSymptom = sources.some((source) => /^S\d/.test(source));
      const toEnd = pairs.some(([, target]) => /^X\d/.test(target));
      const successors = new Map<string, Set<string>>();
      for (const [source, target] of pairs) {
        const targets = successors.get(source) ?? new Set<string>();
        targets.add(target);
        successors.set(source, targets);
      }
      const starts = sources.filter((source) => /^S\d/.test(source));
      const queue = starts.length ? starts : [...sources];
      const visited = new Set<string>();
      while (queue.length) {
        const current = queue.pop();
        if (current === undefined || visited.has(current)) continue;
        visited.add(current);
        queue.push(...(successors.get(current) ?? []));
      }
      const connectivity = pairs.filter(([source]) => visited.has(source)).length / pairs.length;
      const sanity = taken.size / all.size >= 0.95 ? 0.5 : 1;
      const score =
        0.3 * Number(fromSymptom) + 0.3 * Number(toEnd) + 0.3 * connectivity + 0.1 * sanity;
      return {
        score: pythonRound(score),
        explanation: `taken=${taken.size}/${all.size} from_S=${pythonBool(
          fromSymptom
        )} to_X=${pythonBool(toEnd)} connectivity=${pythonFormat(connectivity, 2)}`,
      };
    },
  },
  {
    name: 'evolution_preservation',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ input, output, metadata }) => {
      const existing = input.existing_tree_mermaid || '';
      if (!existing || (metadata.case_type ?? '').includes('new_tree'))
        return { score: 1, explanation: 'n/a (new tree case)' };
      const actual = (output.decision_tree_mermaid || '').trim();
      if (!actual) return { score: 0, explanation: 'empty output' };
      const existingLabels = labels(stripFence(existing));
      const actualLabels = labels(stripFence(actual));
      if (!existingLabels.length) return { score: 1, explanation: 'no labels in existing tree' };
      const preserved = existingLabels.filter((label) => fuzzyIn(label, actualLabels)).length;
      return {
        score: pythonRound(preserved / existingLabels.length),
        explanation: `${preserved}/${existingLabels.length} existing labels fuzzily preserved`,
      };
    },
  },
];

/** Creates the extraction evaluators with the run's selected judge connector. */
export const createEvaluators = (
  inferenceClient: Pick<BoundInferenceClient, 'output'>
): PlanExtractionEvaluator[] => [
  ...codeEvaluators,
  {
    name: 'llm_judge_quality',
    kind: 'LLM',
    direction: 'maximize',
    getVersion: () => promptVersion(QUALITY_SYSTEM, QUALITY_USER, EVOLVE_TEMPLATE),
    evaluate: async ({ input, output, expected, metadata }) => {
      const actual = stripFence(output.decision_tree_mermaid || '');
      if (!actual) return { score: 0, explanation: 'empty output' };
      const reference = (
        expected.expected_tree_mermaid ||
        expected.expected_decision_tree_mermaid ||
        ''
      ).trim();
      const existing = input.existing_tree_mermaid || '';
      const conversation = (input.messages ?? [])
        .map(({ type = 'unknown', content = '' }) => `[${type.toUpperCase()}]: ${content}`)
        .join('\n');
      const evolve =
        existing && !(metadata.case_type ?? '').includes('new_tree')
          ? renderPrompt(EVOLVE_TEMPLATE, { 'existing_tree[:3000]': pythonSlice(existing, 3000) })
          : '';
      try {
        const response = await inferenceClient.output({
          id: 'llm_judge_quality',
          system: QUALITY_SYSTEM,
          input: renderPrompt(QUALITY_USER, {
            'conversation_text[:2000]': pythonSlice(conversation, 2000),
            evolve_section: evolve,
            'expected[:2000]': pythonSlice(reference, 2000),
            'actual[:2000]': pythonSlice(actual, 2000),
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
