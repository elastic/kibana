/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type Conversation } from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { isRecord } from './dashboard_panels';

export const GENERATE_DASHBOARD_TOOL_ID = 'platform.dashboard.generate_dashboard';

type Step = Record<string, unknown>;

export interface ToolError {
  toolId: string;
  error: unknown;
}

/** Error results the agent's tool calls returned, e.g. a rejected panel payload. */
export const getToolErrors = (steps: Step[]): ToolError[] =>
  steps.flatMap((step) =>
    step.type === 'tool_call' && Array.isArray(step.results)
      ? step.results.flatMap((result) =>
          isRecord(result) && result.type === ToolResultType.error
            ? [
                {
                  toolId: String(step.tool_id),
                  error: isRecord(result.data) ? result.data.message ?? result.data : result.data,
                },
              ]
            : []
        )
      : []
  );

/**
 * Attachment id written by the last successful `generate_dashboard` call. The
 * tool result only carries a compact summary; the full dashboard (panel
 * configs, ES|QL, controls, time range) lives on the conversation.
 */
export const getLastWrittenDashboardId = (steps: Step[]): string | undefined => {
  for (const step of steps.toReversed()) {
    if (step.type !== 'tool_call' || step.tool_id !== GENERATE_DASHBOARD_TOOL_ID) {
      continue;
    }
    const results = Array.isArray(step.results) ? step.results : [];
    for (const result of results) {
      if (
        isRecord(result) &&
        isRecord(result.data) &&
        typeof result.data.attachment_id === 'string'
      ) {
        return result.data.attachment_id;
      }
    }
  }
  return undefined;
};

/**
 * Steps of the round across the opening and the answer turn. Answering a
 * prompt resumes the same round, so the answer turn may already report the
 * opening's tool calls; joining both lists would then count them twice.
 */
export const combineTurnSteps = (opening: Step[], answer: Step[]): Step[] => {
  const toolCallIds = (steps: Step[]): string[] =>
    steps.flatMap(({ type, tool_call_id: id }) =>
      type === 'tool_call' && typeof id === 'string' ? [id] : []
    );
  const answerIds = new Set(toolCallIds(answer));
  const openingIds = toolCallIds(opening);
  const answerHasOpening = openingIds.length > 0 && openingIds.every((id) => answerIds.has(id));
  return answerHasOpening ? answer : [...opening, ...answer];
};

/** First and latest stored versions of one dashboard attachment. */
export const readDashboardVersions = (
  conversation: Conversation,
  attachmentId: string
): { first?: DashboardAttachmentData; latest?: DashboardAttachmentData } => {
  const attachment = conversation.attachments?.find(
    ({ id, type }) => id === attachmentId && type === DASHBOARD_ATTACHMENT_TYPE
  );
  if (!attachment) {
    return {};
  }
  return {
    first: attachment.versions[0]?.data as DashboardAttachmentData | undefined,
    latest: getLatestVersion(attachment)?.data as DashboardAttachmentData | undefined,
  };
};

export interface AskUserQuestionPrompt {
  id: string;
  questions: Array<{ question: string; options: Array<{ label: string }> }>;
}

export const findAskUserQuestionPrompt = (prompts: unknown[]): AskUserQuestionPrompt | undefined =>
  prompts.find(
    (prompt): prompt is AskUserQuestionPrompt =>
      isRecord(prompt) &&
      prompt.type === AgentPromptType.ask_user_question &&
      typeof prompt.id === 'string' &&
      Array.isArray(prompt.questions)
  );

export type EnhanceMode = 'appearance' | 'content';

// "Appearance only (no content changes)" is still the appearance option.
const MODE_OPTION_MATCHERS: Record<EnhanceMode, (label: string) => boolean> = {
  appearance: (label) =>
    /appearance/i.test(label) && (/\bonly\b/i.test(label) || !/content/i.test(label)),
  content: (label) => /content/i.test(label) && !/\bonly\b/i.test(label),
};

/** Index of the option offering `mode` ("Appearance only" / "Appearance and content"), or -1. */
export const findModeOptionIndex = (options: Array<{ label: string }>, mode: EnhanceMode): number =>
  options.findIndex(({ label }) => MODE_OPTION_MATCHERS[mode](label));

/** One control the agent asked `generate_dashboard` to add, as sent in the tool params. */
export interface AttemptedControl {
  type: string;
  /** Unset for `time_slider_control`. */
  field?: string;
  userRequested: boolean;
  /** Position of the `generate_dashboard` call that sent it, from 0. */
  call: number;
}

const getGenerateDashboardSteps = (steps: Step[]): Step[] =>
  steps.filter((step) => step.type === 'tool_call' && step.tool_id === GENERATE_DASHBOARD_TOOL_ID);

const getSentControls = ({ params }: Step): Array<Record<string, unknown>> =>
  isRecord(params) && Array.isArray(params.controls) ? params.controls.filter(isRecord) : [];

/**
 * Every control the agent sent in `generate_dashboard` `controls`, in call order. Unlike the
 * stored dashboard, this shows what the agent tried: the server may drop a control whose field is
 * not mapped.
 */
export const getAttemptedControls = (steps: Step[]): AttemptedControl[] =>
  getGenerateDashboardSteps(steps).flatMap((step, call) =>
    getSentControls(step).map((control) => ({
      type: typeof control.type === 'string' ? control.type : 'unknown',
      ...(typeof control.field_name === 'string' ? { field: control.field_name } : {}),
      userRequested: control.user_requested === true,
      call,
    }))
  );

/** A `generate_dashboard` change the server could not apply, as reported under `data.failures`. */
export interface DashboardFailure {
  type: string;
  identifier: string;
  error: string;
  /** Position of the `generate_dashboard` call that reported it, from 0. */
  call: number;
}

const getStepFailures = ({ results }: Step, call: number): DashboardFailure[] =>
  (Array.isArray(results) ? results : [])
    .flatMap((result) =>
      isRecord(result) && isRecord(result.data) && Array.isArray(result.data.failures)
        ? result.data.failures
        : []
    )
    .filter(
      (failure): failure is Omit<DashboardFailure, 'call'> =>
        isRecord(failure) &&
        typeof failure.type === 'string' &&
        typeof failure.identifier === 'string' &&
        typeof failure.error === 'string'
    )
    .map(({ type, identifier, error }) => ({ type, identifier, error, call }));

/** Failures every `generate_dashboard` call reported. */
export const getDashboardFailures = (steps: Step[]): DashboardFailure[] =>
  getGenerateDashboardSteps(steps).flatMap(getStepFailures);

const CONTROL_INPUT_IDENTIFIER = /^controls\[\d+\]$/;

/**
 * Failures of the controls each `generate_dashboard` call sent. The server identifies a control
 * by its position (`controls[1]`) or by its field, grouping same-message fields as "a, b".
 */
export const getControlFailures = (steps: Step[]): DashboardFailure[] =>
  getGenerateDashboardSteps(steps).flatMap((step, call) => {
    const sentFields = new Set(
      getSentControls(step).flatMap(({ field_name: field }) =>
        typeof field === 'string' ? [field] : []
      )
    );
    return getStepFailures(step, call).filter(
      ({ identifier }) =>
        CONTROL_INPUT_IDENTIFIER.test(identifier) ||
        identifier.split(',').every((field) => sentFields.has(field.trim()))
    );
  });
