/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse, stringify } from 'yaml';
import { INLINE_WORKFLOW_TAG } from '../constants';
import { INLINE_ACTION_STEP_DEFINITIONS } from '../registry';
import type { ActionDraft, ActionDraftOrigin } from '../types';

interface WorkflowDefinitionForActionDraft {
  tags?: string[] | null;
  steps?: Array<{
    type?: string;
    'connector-id'?: string | null;
    with?: Record<string, unknown> | null;
  }> | null;
}

/**
 * Minimal shape of a fetched workflow needed to reverse-map it back into an
 * {@link ActionDraft}. Compatible with the `WorkflowDetailDto` returned by the
 * workflows API (`{ id, definition, yaml }`). `definition` is preferred when
 * present; otherwise the raw `yaml` is parsed as a fallback.
 */
export interface WorkflowForActionDraft {
  id: string;
  definition?: WorkflowDefinitionForActionDraft | null;
  yaml?: string | null;
}

/**
 * Normalizes a workflow step `type` to the base connector type so it can be
 * matched against the registry regardless of how it is written in the stored
 * definition, e.g. `.slack`, `slack`, or `slack.postMessage` all resolve to
 * `slack`.
 */
const normalizeStepType = (type: string): string => {
  const withoutDot = type.startsWith('.') ? type.slice(1) : type;
  return withoutDot.split('.')[0];
};

const stepTypeFromConnectorType = (connectorTypeId: string): string =>
  normalizeStepType(connectorTypeId);

const stringifyParams = (params: Record<string, unknown>): string =>
  stringify(params, { indent: 2, lineWidth: 0 }).trimEnd();

/**
 * Resolves the workflow definition, falling back to parsing the raw `yaml` when
 * the API response did not populate `definition`.
 */
const resolveDefinition = (
  workflow: WorkflowForActionDraft
): WorkflowDefinitionForActionDraft | undefined => {
  if (workflow.definition) {
    return workflow.definition;
  }
  if (!workflow.yaml) {
    return undefined;
  }
  try {
    const parsed = parse(workflow.yaml);
    return parsed && typeof parsed === 'object'
      ? (parsed as WorkflowDefinitionForActionDraft)
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Reverse of {@link buildInlineWorkflowYaml} / the existing-workflow flow: turns
 * a fetched workflow into a draft used to populalate the rule's existing
 * simple actions when editing. Inline workflows (tagged with
 * {@link INLINE_WORKFLOW_TAG}) become inline drafts so the type/connector/params
 * are shown and editable; everything else becomes an existing-workflow draft.
 * When `origin` is provided it is attached so saving can update or
 * delete the source policy/workflow instead of creating a duplicate.
 */
export const mapWorkflowToActionDraft = (
  workflow: WorkflowForActionDraft,
  origin?: ActionDraftOrigin
): ActionDraft => {
  const definition = resolveDefinition(workflow);
  const tags = definition?.tags ?? [];
  const step = definition?.steps?.[0];

  const id = origin?.policyId ?? workflow.id;

  if (tags.includes(INLINE_WORKFLOW_TAG) && step?.type) {
    const normalizedType = normalizeStepType(step.type);
    const inlineDefinition = INLINE_ACTION_STEP_DEFINITIONS.find(
      (candidate) => stepTypeFromConnectorType(candidate.connectorTypeId) === normalizedType
    );

    if (inlineDefinition) {
      return {
        id,
        source: 'inline',
        stepType: inlineDefinition.id,
        connectorId: step['connector-id'] ?? null,
        params: stringifyParams(step.with ?? {}),
        ...(origin ? { origin } : {}),
      };
    }
  }

  return {
    id,
    source: 'existing',
    workflowId: workflow.id,
    ...(origin ? { origin } : {}),
  };
};
