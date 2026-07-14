/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep } from '@kbn/evals';
import { platformCoreTools, platformSignificantEventsTools } from '@kbn/agent-builder-common';
import { scoreToolUsage, scoreToolUsageContinuation } from './tool_usage';

const TOOL_ID_EXECUTE_ESQL = platformCoreTools.executeEsql;
const {
  searchKnowledgeIndicators: TOOL_ID_KI_SEARCH,
  searchEvent: TOOL_ID_EVENT_SEARCH,
  discoveryWrite: TOOL_ID_DISCOVERY_WRITE,
} = platformSignificantEventsTools;

const toolCall = (toolId: string): ConverseStep => ({
  type: 'tool_call',
  tool_id: toolId,
  tool_call_id: toolId,
});

const allExpectedTools: ConverseStep[] = [
  toolCall(TOOL_ID_EVENT_SEARCH),
  toolCall(TOOL_ID_KI_SEARCH),
  toolCall(TOOL_ID_EXECUTE_ESQL),
  toolCall(TOOL_ID_DISCOVERY_WRITE),
];

describe('scoreToolUsage', () => {
  it('scores 1 when an empty batch makes no tool calls', () => {
    expect(scoreToolUsage([], 0)).toEqual({
      score: 1,
      label: 'correct',
      explanation: 'Empty batch: no tool calls made as expected',
    });
  });

  it('scores 0 when an empty batch makes unexpected tool calls', () => {
    const result = scoreToolUsage([toolCall(TOOL_ID_KI_SEARCH)], 0);
    expect(result.score).toBe(0);
    expect(result.label).toBe('unexpected-tools');
  });

  it('scores 1 and labels "correct" when all expected tools were called', () => {
    expect(scoreToolUsage(allExpectedTools, 1)).toEqual({
      score: 1,
      label: 'correct',
      explanation: 'Correctly called all tools',
    });
  });

  it('scores 0 and labels missing-discovery_write when discovery_write is never called', () => {
    const steps = allExpectedTools.filter((s) => s.tool_id !== TOOL_ID_DISCOVERY_WRITE);
    const result = scoreToolUsage(steps, 1);
    expect(result.score).toBe(0);
    expect(result.label).toBe(`missing-${TOOL_ID_DISCOVERY_WRITE}`);
  });

  it('gives partial credit when one of the three expected investigation tools is missing', () => {
    const steps = allExpectedTools.filter((s) => s.tool_id !== TOOL_ID_EVENT_SEARCH);
    const result = scoreToolUsage(steps, 1);
    expect(result.score).toBeCloseTo(2 / 3);
    expect(result.label).toBe(`missing-${TOOL_ID_EVENT_SEARCH}`);
  });
});

describe('scoreToolUsageContinuation', () => {
  it('scores 0 with an explanatory message when there are no cycles', () => {
    expect(scoreToolUsageContinuation([])).toEqual({
      score: 0,
      label: 'no-cycles',
      explanation: 'No cycles to score',
    });
  });

  it('scores 1 when every cycle called all expected tools (reuses scoreToolUsage per cycle)', () => {
    const result = scoreToolUsageContinuation([
      { producedSlugs: ['svc__a-1111'], steps: allExpectedTools },
      { producedSlugs: ['svc__a-1111'], steps: allExpectedTools },
    ]);
    expect(result.score).toBe(1);
  });

  it('averages per-cycle scores rather than treating one bad cycle as a total failure', () => {
    const missingEventSearch = allExpectedTools.filter((s) => s.tool_id !== TOOL_ID_EVENT_SEARCH);
    const result = scoreToolUsageContinuation([
      { producedSlugs: ['svc__a-1111'], steps: allExpectedTools },
      { producedSlugs: ['svc__a-1111'], steps: missingEventSearch }, // missing 1 of 3 → 2/3
    ]);
    expect(result.score).toBeCloseTo((1 + 2 / 3) / 2);
    expect(result.label).toBe('partial');
    expect(result.explanation).toContain(`cycle 2: missing-${TOOL_ID_EVENT_SEARCH} (${2 / 3})`);
  });

  it('treats a cycle with no recorded steps as having called nothing', () => {
    const result = scoreToolUsageContinuation([{ producedSlugs: [] }]);
    expect(result.score).toBeLessThan(1);
  });
});
