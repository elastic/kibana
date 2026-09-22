/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout } from 'timers/promises';
import type { HttpHandler } from '@kbn/core/public';
import type { ConversationRound, ConversationRoundStep } from '@kbn/agent-builder-common';
import type {
  InvestigationStructuredOutput,
  StartInvestigationResponse,
  GetInvestigationResponse,
} from '@kbn/nightshift-investigations-plugin/common';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { isToolCallStep, ToolResultType } from '@kbn/agent-builder-common';
import type { InvestigationExample, GoldenTaskOutput, TrajectoryStep } from './types';
import { DOORDASH_ALERT_EVAL_CONSTRAINTS } from './prompts';

/** Adapts persisted tool calls to the Deductive grader's trajectory format. */
export const buildTrajectory = (
  steps: ConversationRoundStep[],
  finalAnswer: string
): TrajectoryStep[] => {
  const trajectory: TrajectoryStep[] = [];
  for (const step of steps.filter(isToolCallStep)) {
    const { tool_id: toolName, params, results } = step;
    const command = typeof params.command === 'string' ? params.command : JSON.stringify(params);
    trajectory.push({
      step_type: 'tool_call',
      tool_name: toolName,
      tool_args: params,
      content: `Called ${toolName}: ${command.slice(0, 200)}`,
      tool_output: null,
      success: true,
    });
    const output = JSON.stringify(results);
    const success = !results.some(({ type }) => type === ToolResultType.error);
    trajectory.push({
      step_type: 'tool_result',
      tool_name: toolName,
      tool_args: null,
      tool_output: output.slice(0, 2000),
      success,
      content: `Tool output (success=${success ? 'True' : 'False'}): ${output.slice(0, 500)}`,
    });
  }
  trajectory.push({
    step_type: 'response',
    content: finalAnswer,
    tool_name: null,
    tool_args: null,
    tool_output: null,
    success: true,
  });
  return trajectory;
};

/** Renders the report deterministically in the ranked format understood by the golden judges. */
export const renderFinalAnswer = (report: InvestigationStructuredOutput): string => {
  const hasReport = Object.values(report).some(
    (value) => value !== undefined && (Array.isArray(value) ? value.length > 0 : Boolean(value))
  );
  if (!hasReport) return '';
  return [
    '## Conclusion',
    report.conclusion ?? report.summary ?? '',
    `Severity: ${report.severity ?? 'unknown'}`,
    '',
    '## Root Cause Hypotheses (ranked)',
    ...[...(report.hypotheses ?? [])]
      .sort((first, second) => second.confidence - first.confidence)
      .flatMap((hypothesis, index) => [
        `${index + 1}. ${hypothesis.candidate} — ${hypothesis.status}; confidence: ${Math.round(
          hypothesis.confidence * 100
        )}%`,
        hypothesis.reason ?? '',
        ...(hypothesis.evidence ?? []).map(
          ({ description, esql_query: query }) =>
            `   - ${description}${query ? `\n     ${query}` : ''}`
        ),
      ]),
    '',
    '## Recommendations',
    ...(report.recommendations ?? []).map(
      ({ title, description, code }) =>
        `- ${title}${description ? `: ${description}` : ''}${
          code ? `\n\n\`\`\`\n${code}\n\`\`\`` : ''
        }`
    ),
    '',
    '## Blind spots',
    ...(report.blind_spots ?? []).map(({ title, description }) => `- ${title}: ${description}`),
  ].join('\n');
};

/** Resolves the agent's trace ID across conversation API string and array representations. */
export const getConversationTraceId = (
  rounds: Array<Pick<ConversationRound, 'trace_id'>>
): string | undefined =>
  rounds
    .flatMap(({ trace_id: traceId }) => (typeof traceId === 'string' ? [traceId] : traceId ?? []))
    .filter(Boolean)
    .at(-1);

/**
 * Runs the manual product investigation and returns the evidence shared with Deductive's golden
 * runner. `constraints` is the eval-only suffix appended to the question (DoorDash by default).
 */
export const runGoldenInvestigation = async (
  fetch: HttpHandler,
  example: InvestigationExample,
  constraints: string = DOORDASH_ALERT_EVAL_CONSTRAINTS
): Promise<GoldenTaskOutput> => {
  const started = Date.now();
  const output: GoldenTaskOutput = {
    test_id:
      example.metadata.case_id ||
      example.metadata.langsmith_example_id ||
      example.input.question.slice(0, 80),
    query: example.input.question,
    max_latency_seconds: Number(example.metadata.max_latency_seconds),
    metrics: {},
    latency_seconds: 0,
    tool_names_invoked: [],
    total_tool_calls: 0,
    failed_tool_calls: 0,
    final_answer: '',
    healthcheck: null,
    as_of_offset_minutes: null,
    as_of_ts: null,
    severity_truth: null,
    outcome_after_as_of: null,
    execution_error: null,
    trajectory: [],
    investigation_id: null,
    conversation_id: null,
    workflow_status: null,
    structured_report: null,
  };
  try {
    const { investigation_id: investigationId } = await fetch<StartInvestigationResponse>(
      '/internal/nightshift/investigations',
      {
        method: 'POST',
        body: JSON.stringify({
          subject: { type: 'manual' },
          message: example.input.question + constraints,
        }),
      }
    );
    output.investigation_id = investigationId;
    let investigation = await fetch<GetInvestigationResponse>(
      `/internal/nightshift/investigations/${encodeURIComponent(investigationId)}`
    );
    while (investigation.status === 'pending' || investigation.status === 'running') {
      if (Date.now() - started > 20 * 60_000)
        throw new Error('Investigation did not reach a terminal status within 20 minutes');
      await setTimeout(1000);
      investigation = await fetch<GetInvestigationResponse>(
        `/internal/nightshift/investigations/${encodeURIComponent(investigationId)}`
      );
    }
    output.workflow_status = investigation.status;
    output.conversation_id = investigation.conversation_id ?? null;
    if (investigation.status !== 'completed') {
      const workflow = await fetch<WorkflowExecutionDto>(
        `/api/workflows/executions/${encodeURIComponent(investigationId)}`,
        { headers: { 'elastic-api-version': '2023-10-31' } }
      );
      output.workflow_status = workflow.status;
      output.execution_error =
        workflow.stepExecutions.find(({ stepId }) => stepId === 'investigate')?.error?.message ||
        workflow.error?.message ||
        investigation.error ||
        `Investigation ${investigation.status}`;
    }
    const {
      summary,
      conclusion,
      severity,
      hypotheses,
      recommendations,
      blind_spots: blindSpots,
      trigger_feedback: triggerFeedback,
      impact,
    } = investigation;
    output.structured_report = {
      summary,
      conclusion,
      severity,
      hypotheses,
      recommendations,
      blind_spots: blindSpots,
      trigger_feedback: triggerFeedback,
      impact,
    };
    output.final_answer = renderFinalAnswer(output.structured_report);
    if (!output.final_answer) output.structured_report = null;
    if (output.conversation_id) {
      const conversation = await fetch<{ rounds: ConversationRound[] }>(
        `/api/agent_builder/conversations/${encodeURIComponent(output.conversation_id)}`,
        { headers: { 'elastic-api-version': '2023-10-31' } }
      );
      output.traceId = getConversationTraceId(conversation.rounds);
      output.trajectory = buildTrajectory(
        conversation.rounds.flatMap(({ steps }) => steps),
        output.final_answer
      );
    } else if (!output.execution_error) {
      output.execution_error = 'Completed investigation has no conversation id';
    }
    const calls = output.trajectory.filter(({ step_type }) => step_type === 'tool_call');
    output.tool_names_invoked = [
      ...new Set(calls.flatMap(({ tool_name }) => (tool_name ? [tool_name] : []))),
    ];
    output.total_tool_calls = calls.length;
    output.failed_tool_calls = output.trajectory.filter(
      ({ step_type, success }) => step_type === 'tool_result' && !success
    ).length;
  } catch (error) {
    output.execution_error ??= error instanceof Error ? error.message : String(error);
  }
  output.latency_seconds = (Date.now() - started) / 1000;
  return output;
};
