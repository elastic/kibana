/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import { isRecord } from '../dashboard_panels';
import { GENERATE_DASHBOARD_TOOL_ID } from '../extract_dashboard';
import { type Check, scoreChecks, skippedResult } from '../evaluator_utils';
import type { DashboardAgentEvaluator } from '../types';

export const PANEL_CONFIG_REFERENCE_EVALUATOR_NAME = 'Dashboard Panel Config Reference';

const FILE_READ_TOOL_IDS: ReadonlySet<unknown> = new Set(['read_file', 'filestore.read']);

type Step = Record<string, unknown>;

/** The path of a read that returned content, so a failed or empty read does not count. */
const getReadPath = (step: Step): string | undefined => {
  if (step.type !== 'tool_call' || !FILE_READ_TOOL_IDS.has(step.tool_id)) {
    return undefined;
  }
  const { results } = step;
  const returnedContent =
    Array.isArray(results) &&
    results.length > 0 &&
    !results.some((result) => isRecord(result) && result.type === ToolResultType.error);
  if (!returnedContent) {
    return undefined;
  }
  return isRecord(step.params) && typeof step.params.path === 'string'
    ? step.params.path
    : undefined;
};

const getWrittenPanelTypes = (step: Step): string[] => {
  if (step.type !== 'tool_call' || step.tool_id !== GENERATE_DASHBOARD_TOOL_ID) {
    return [];
  }
  const panels =
    isRecord(step.params) && Array.isArray(step.params.panels) ? step.params.panels : [];
  return panels.flatMap((panel: unknown) =>
    isRecord(panel) && isRecord(panel.content) && typeof panel.content.type === 'string'
      ? [panel.content.type]
      : []
  );
};

const getGroupId = (step: Step): string | undefined =>
  typeof step.tool_call_group_id === 'string' ? step.tool_call_group_id : undefined;

/**
 * Whether the agent successfully read the type's config reference before its first
 * `generate_dashboard` call that writes a panel of the type. Calls in one tool-call group run in
 * parallel, so a read in the write's own group does not count: the write was composed before the
 * reference came back. A write that fails validation counts: the reference is what saves that
 * retry.
 */
const checkReferenceReadFirst = (steps: Step[], type: string): Check => {
  const assertion = `reads ${type}.md before writing a ${type} panel`;
  const referenceSuffix = `panel_configs/${type}.md`;
  const readGroups: Array<string | undefined> = [];
  for (const step of steps) {
    if (getReadPath(step)?.endsWith(referenceSuffix)) {
      readGroups.push(getGroupId(step));
    }
    if (getWrittenPanelTypes(step).includes(type)) {
      const writeGroup = getGroupId(step);
      const readFirst = readGroups.some((group) => group === undefined || group !== writeGroup);
      return {
        assertion,
        passed: readFirst,
        detail: readFirst
          ? 'read first'
          : 'the first write came before the reference was read, or in the same parallel call group',
      };
    }
  }
  return {
    assertion,
    passed: false,
    detail:
      readGroups.length > 0
        ? 'read, but no panel of the type was written'
        : 'no panel of the type was written',
  };
};

/**
 * For the referenced panel types the prompt asks for (their config schemas are not in the tool
 * schema), the agent reads each type's config reference before writing a panel of that type.
 * Scored as the fraction of gold types that hold.
 */
export const panelConfigReferenceEvaluator: DashboardAgentEvaluator = {
  name: PANEL_CONFIG_REFERENCE_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const types = expected?.panelConfigTypes;
    if (!types?.length) {
      return skippedResult('No gold referenced panel types.');
    }
    const steps = output.steps ?? [];
    return scoreChecks(
      types.map((type) => checkReferenceReadFirst(steps, type)),
      { subject: 'panel config reference', passLabel: 'read-first' }
    );
  },
};
