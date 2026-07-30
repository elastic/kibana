/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import {
  getManagedWorkflowDefinition,
  getManagedWorkflowDefinitions,
  type ManagedWorkflowDefinition,
} from '@kbn/workflows/managed';
import { HUMAN_RUN_ORIGINS, RUN_BUDGET_GROUP_ENGINE, RUN_BUDGET_GROUP_IDS } from '../../../common';
import {
  GATED_WORKFLOW_BUDGET_GROUPS,
  GATED_WORKFLOW_IDS,
  isGatedWorkflowId,
  runQuotaValuesFor,
  workflowIdsInBudgetGroup,
} from './budget_groups';
import { RUN_LEDGER_DATA_STREAM, RUN_OUTCOME_ADMITTED } from './data_stream';

const RENDER_VALUES = {
  runQuotaEnabled: true,
  runDailyLimit: 42,
  runQuotaTimeZone: 'Europe/Zurich',
};

interface ParsedWorkflow {
  consts?: Record<string, unknown>;
  steps: Array<{ name: string; with?: Record<string, unknown> }>;
}

const renderYaml = ({ id, yaml, yamlTemplate }: ManagedWorkflowDefinition): string => {
  if (typeof yamlTemplate === 'function') {
    return yamlTemplate(RENDER_VALUES);
  }
  if (typeof yaml === 'string') {
    return yaml;
  }
  throw new Error(`Managed workflow '${id}' defines neither yaml nor yamlTemplate`);
};

const parseWorkflow = (definition: ManagedWorkflowDefinition): ParsedWorkflow =>
  parse(renderYaml(definition)) as ParsedWorkflow;

const requireStep = (workflow: ParsedWorkflow, name: string) => {
  const step = workflow.steps.find((candidate) => candidate.name === name);
  if (!step) {
    throw new Error(`Expected a step named ${name}`);
  }
  return step;
};

const gatedWorkflows = GATED_WORKFLOW_IDS.map((workflowId) => {
  const definition = getManagedWorkflowDefinition(workflowId);
  if (!definition) {
    throw new Error(`Unknown managed workflow id '${workflowId}'`);
  }
  return [workflowId, parseWorkflow(definition)] as const;
});

describe('run budget groups', () => {
  it('covers every budget group with at least one workflow', () => {
    for (const group of RUN_BUDGET_GROUP_IDS) {
      expect(workflowIdsInBudgetGroup(group).length).toBeGreaterThan(0);
    }
  });

  it('renders the limit of the group a workflow belongs to', () => {
    const settings = {
      timezone: 'Asia/Tokyo',
      limits: {
        ki_extraction: { enabled: true, max: 3 },
        memory: { enabled: false, max: 9 },
        detection: { enabled: true, max: 20 },
        investigation: { enabled: true, max: 10 },
      },
    };

    expect(runQuotaValuesFor(settings, 'system-significant-events-memory-synthesis')).toEqual({
      runQuotaEnabled: false,
      runDailyLimit: 9,
      runQuotaTimeZone: 'Asia/Tokyo',
    });
  });

  it.each(gatedWorkflows)(
    '%s stamps the ledger for its own budget group',
    (workflowId, workflow) => {
      const group = GATED_WORKFLOW_BUDGET_GROUPS[workflowId];

      expect(workflow.consts).toMatchObject({
        RUN_LEDGER_INDEX: RUN_LEDGER_DATA_STREAM,
        RUN_BUDGET_GROUP: group,
        RUN_ENGINE: RUN_BUDGET_GROUP_ENGINE[group],
        // Rendered from the install-time values, not left as template tokens.
        RUN_QUOTA_ENABLED: RENDER_VALUES.runQuotaEnabled,
        RUN_DAILY_LIMIT: RENDER_VALUES.runDailyLimit,
        RUN_QUOTA_TIME_ZONE: RENDER_VALUES.runQuotaTimeZone,
      });
    }
  );

  it.each(gatedWorkflows)(
    '%s gates on the daily count before doing any work',
    (_workflowId, workflow) => {
      // The gate is only meaningful if nothing runs ahead of it.
      expect(workflow.steps.slice(0, 6).map(({ name }) => name)).toEqual([
        'quota_resolve_origin',
        'quota_count_runs',
        'quota_evaluate',
        'quota_decide',
        'quota_record_run',
        'quota_stop_if_exhausted',
      ]);

      // Refused runs are recorded but must not count against the next day's budget.
      expect(JSON.stringify(requireStep(workflow, 'quota_count_runs').with)).toContain(
        `"outcome":"${RUN_OUTCOME_ADMITTED}"`
      );
    }
  );

  it.each(gatedWorkflows)(
    '%s exempts exactly the human run origins from the gate',
    (_workflowId, workflow) => {
      const { quotaAutomated } = requireStep(workflow, 'quota_evaluate').with as {
        quotaAutomated: string;
      };

      for (const origin of HUMAN_RUN_ORIGINS) {
        expect(quotaAutomated).toContain(`variables.runOrigin != "${origin}"`);
      }
      // A stray extra exemption would silently let automation bypass the limit.
      expect(quotaAutomated.match(/variables\.runOrigin != "/g)).toHaveLength(
        HUMAN_RUN_ORIGINS.length
      );
    }
  );

  it('registers every workflow that carries the gate', () => {
    const gatedByYaml = getManagedWorkflowDefinitions()
      .filter((definition) =>
        parseWorkflow(definition).steps.some(({ name }) => name === 'quota_count_runs')
      )
      .map(({ id }) => id)
      .sort();

    expect(gatedByYaml).toEqual([...GATED_WORKFLOW_IDS].sort());
    expect(gatedByYaml.every(isGatedWorkflowId)).toBe(true);
  });
});
