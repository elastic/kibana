/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools, platformSignificantEventsTools } from '@kbn/agent-builder-common';
import type { ConverseStep } from '@kbn/evals';
import type { Discovery, SignalEntry } from '@kbn/significant-events-schema';
import { scoreJudgeToolUsage } from './tool_usage';

const {
  searchKnowledgeIndicators: TOOL_ID_KI_SEARCH,
  eventsWrite: TOOL_ID_EVENTS_WRITE,
  discoveryWrite: TOOL_ID_DISCOVERY_WRITE,
} = platformSignificantEventsTools;
const TOOL_ID_EXECUTE_ESQL = platformCoreTools.executeEsql;

const toolCall = (toolId: string): ConverseStep => ({
  type: 'tool_call',
  tool_id: toolId,
  tool_call_id: toolId,
});

const retryCall = (toolId: string): ConverseStep => ({
  ...toolCall(toolId),
  params: { items: [{ event_id: 'failed-event' }] },
});

const retryableEventsWriteCall = (): ConverseStep => ({
  ...toolCall(TOOL_ID_EVENTS_WRITE),
  results: [{ data: { results: [{ index: 0, written: false, reason: 'bulk_error' }] } }],
});

const detectionSignal = (withQuery: boolean): SignalEntry => ({
  type: 'detection',
  stream_name: 'logs',
  description: 'Current-state check',
  evidence: withQuery ? { esql_query: 'FROM logs | LIMIT 1', result: 'found' } : undefined,
  metadata: {
    rule_uuid: 'rule-1',
    detection_id: 'detection-1',
    change_point_type: 'spike',
    p_value: 0.01,
  },
});

const discovery = (withQuery: boolean): Pick<Discovery, 'signals'> => ({
  signals: [detectionSignal(withQuery)],
});

describe('scoreJudgeToolUsage', () => {
  it('uses ES|QL and events_write without KI search when evidence has a query', () => {
    expect(
      scoreJudgeToolUsage({
        discoveries: [discovery(true)],
        steps: [toolCall(TOOL_ID_EXECUTE_ESQL), toolCall(TOOL_ID_EVENTS_WRITE)],
      })
    ).toMatchObject({ score: 1, label: 'correct' });
  });

  it('requires KI search when evidence has no query', () => {
    expect(
      scoreJudgeToolUsage({
        discoveries: [discovery(false)],
        steps: [
          toolCall(TOOL_ID_KI_SEARCH),
          toolCall(TOOL_ID_EXECUTE_ESQL),
          toolCall(TOOL_ID_EVENTS_WRITE),
        ],
      })
    ).toMatchObject({ score: 1, label: 'correct' });
  });

  it('fails when events_write is missing', () => {
    expect(
      scoreJudgeToolUsage({
        discoveries: [discovery(true)],
        steps: [toolCall(TOOL_ID_EXECUTE_ESQL)],
      })
    ).toMatchObject({ score: 0, label: 'missing-output-write' });
  });

  it('penalizes discovery_write because handled stamping belongs to triage', () => {
    expect(
      scoreJudgeToolUsage({
        discoveries: [discovery(true)],
        steps: [
          toolCall(TOOL_ID_EXECUTE_ESQL),
          toolCall(TOOL_ID_EVENTS_WRITE),
          toolCall(TOOL_ID_DISCOVERY_WRITE),
        ],
      })
    ).toMatchObject({
      score: 0.5,
      label: `unnecessary-${TOOL_ID_DISCOVERY_WRITE}`,
    });
  });

  it('penalizes multiple event writes without a partial-failure retry', () => {
    expect(
      scoreJudgeToolUsage({
        discoveries: [discovery(true)],
        steps: [
          toolCall(TOOL_ID_EXECUTE_ESQL),
          toolCall(TOOL_ID_EVENTS_WRITE),
          toolCall(TOOL_ID_EVENTS_WRITE),
        ],
      })
    ).toMatchObject({ score: 0.75, label: 'multiple-events-write-calls' });
  });

  it('allows one retry after an event bulk item fails', () => {
    expect(
      scoreJudgeToolUsage({
        discoveries: [discovery(true)],
        steps: [
          toolCall(TOOL_ID_EXECUTE_ESQL),
          retryableEventsWriteCall(),
          retryCall(TOOL_ID_EVENTS_WRITE),
        ],
      })
    ).toMatchObject({ score: 1, label: 'correct' });
  });
});
