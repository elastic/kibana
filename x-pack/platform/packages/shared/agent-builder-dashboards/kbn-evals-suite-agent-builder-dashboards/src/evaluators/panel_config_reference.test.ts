/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import { GENERATE_DASHBOARD_TOOL_ID } from '../extract_dashboard';
import { panelConfigReferenceEvaluator } from './panel_config_reference';

const REFERENCE_PATH = '/skills/platform/dashboard/dashboards/panel_configs/ml_anomaly_swimlane.md';

const read = (
  path: string,
  results: Array<Record<string, unknown>> = [{ type: ToolResultType.other, data: {} }],
  toolId = 'read_file'
): Record<string, unknown> => ({ type: 'tool_call', tool_id: toolId, params: { path }, results });

const inGroup = (step: Record<string, unknown>, groupId: string): Record<string, unknown> => ({
  ...step,
  tool_call_group_id: groupId,
});

const write = (...types: string[]): Record<string, unknown> => ({
  type: 'tool_call',
  tool_id: GENERATE_DASHBOARD_TOOL_ID,
  params: { panels: types.map((type) => ({ id: type, content: { type } })) },
  results: [],
});

const evaluateSteps = (
  steps: Array<Record<string, unknown>>,
  panelConfigTypes: readonly string[] | undefined = ['ml_anomaly_swimlane']
) =>
  panelConfigReferenceEvaluator.evaluate({
    input: { question: 'q' },
    expected: { panelConfigTypes },
    metadata: undefined,
    output: { errors: [], messages: [], steps },
  });

describe('dashboard panel config reference evaluator', () => {
  it('skips examples without gold panel config types', async () => {
    const result = await evaluateSteps([], []);
    expect(result.score).toBeNull();
  });

  it('passes a read before the first write of the type', async () => {
    const result = await evaluateSteps([read(REFERENCE_PATH), write('ml_anomaly_swimlane')]);
    expect(result.score).toBe(1);
  });

  it('accepts the filestore read tool', async () => {
    const result = await evaluateSteps([
      read(REFERENCE_PATH, undefined, 'filestore.read'),
      write('ml_anomaly_swimlane'),
    ]);
    expect(result.score).toBe(1);
  });

  it('fails a write before the read', async () => {
    const result = await evaluateSteps([write('ml_anomaly_swimlane'), read(REFERENCE_PATH)]);
    expect(result.score).toBe(0);
  });

  it('fails a read with no write of the type', async () => {
    const result = await evaluateSteps([read(REFERENCE_PATH), write('markdown')]);
    expect(result.score).toBe(0);
  });

  it('fails a read of another type reference', async () => {
    const result = await evaluateSteps([
      read(REFERENCE_PATH.replace('ml_anomaly_swimlane', 'ml_anomaly_charts')),
      write('ml_anomaly_swimlane'),
    ]);
    expect(result.score).toBe(0);
  });

  it('fails a read that returned an error or no content', async () => {
    const failed = await evaluateSteps([
      read(REFERENCE_PATH, [{ type: ToolResultType.error, data: { message: 'not found' } }]),
      write('ml_anomaly_swimlane'),
    ]);
    const empty = await evaluateSteps([read(REFERENCE_PATH, []), write('ml_anomaly_swimlane')]);
    expect([failed.score, empty.score]).toEqual([0, 0]);
  });

  it('fails a read and a write in the same parallel tool-call group', async () => {
    const result = await evaluateSteps([
      inGroup(read(REFERENCE_PATH), 'group-1'),
      inGroup(write('ml_anomaly_swimlane'), 'group-1'),
    ]);
    expect(result.score).toBe(0);
  });

  it('passes a read in an earlier tool-call group', async () => {
    const result = await evaluateSteps([
      inGroup(read(REFERENCE_PATH), 'group-1'),
      inGroup(write('ml_anomaly_swimlane'), 'group-2'),
    ]);
    expect(result.score).toBe(1);
  });

  it('scores the fraction of types whose reference was read first', async () => {
    const result = await evaluateSteps(
      [read(REFERENCE_PATH), write('ml_anomaly_swimlane', 'ml_anomaly_charts')],
      ['ml_anomaly_swimlane', 'ml_anomaly_charts']
    );
    expect(result.score).toBe(0.5);
  });
});
