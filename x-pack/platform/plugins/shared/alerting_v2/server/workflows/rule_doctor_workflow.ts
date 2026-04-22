/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type {
  EsWorkflow,
  WorkflowExecutionEngineModel,
  ExecutionStatusUnion,
  WorkflowStepExecutionDto,
} from '@kbn/workflows';
import DEDUPLICATION_WORKFLOW_YAML from './rule_doctor_deduplication.yaml';
import THRESHOLD_TUNING_WORKFLOW_YAML from './rule_doctor_threshold_tuning.yaml';
import STALE_RULES_WORKFLOW_YAML from './rule_doctor_stale_rules.yaml';
import COVERAGE_GAP_WORKFLOW_YAML from './rule_doctor_coverage_gap.yaml';

export const RULE_DOCTOR_WORKFLOW_ID = 'workflow-rule-doctor-a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const RULE_DOCTOR_THRESHOLD_TUNING_WORKFLOW_ID =
  'workflow-rule-doctor-threshold-tuning-b2c3d4e5-f6a7-8901-bcde-f12345678901';
const RULE_DOCTOR_STALE_RULES_WORKFLOW_ID =
  'workflow-rule-doctor-stale-rules-c3d4e5f6-a7b8-9012-cdef-123456789012';
const RULE_DOCTOR_COVERAGE_GAP_WORKFLOW_ID =
  'workflow-rule-doctor-coverage-gap-d4e5f6a7-b8c9-0123-defa-234567890123';

export type InsightType = 'deduplication' | 'threshold_tuning' | 'stale_rule' | 'coverage_gap';

interface WorkflowDefinition {
  id: string;
  yaml: string;
  insightType: InsightType;
  label: string;
  analyzeStepId: string;
  stepOrder: Array<{ stepId: string; label: string }>;
}

const WORKFLOW_DEFINITIONS: WorkflowDefinition[] = [
  {
    id: RULE_DOCTOR_WORKFLOW_ID,
    yaml: DEDUPLICATION_WORKFLOW_YAML,
    insightType: 'deduplication',
    label: 'Deduplication',
    analyzeStepId: 'find_duplicates',
    stepOrder: [
      { stepId: 'find_duplicates', label: 'Analyzing for duplicates' },
      { stepId: 'validate_rules', label: 'Validating proposed rules' },
      { stepId: 'correction_loop', label: 'Correcting invalid rules' },
      { stepId: 'fetch_open_findings', label: 'Fetching existing findings' },
      { stepId: 'evaluate_existing', label: 'Evaluating stale findings' },
      { stepId: 'dismiss_stale_findings', label: 'Dismissing stale findings' },
      { stepId: 'persist_findings', label: 'Persisting findings' },
      { stepId: 'output_findings', label: 'Preparing results' },
    ],
  },
  {
    id: RULE_DOCTOR_THRESHOLD_TUNING_WORKFLOW_ID,
    yaml: THRESHOLD_TUNING_WORKFLOW_YAML,
    insightType: 'threshold_tuning',
    label: 'Threshold Tuning',
    analyzeStepId: 'analyze_thresholds',
    stepOrder: [
      { stepId: 'analyze_thresholds', label: 'Analyzing thresholds' },
      { stepId: 'validate_rules', label: 'Validating proposed rules' },
      { stepId: 'correction_loop', label: 'Correcting invalid rules' },
      { stepId: 'fetch_open_findings', label: 'Fetching existing findings' },
      { stepId: 'evaluate_existing', label: 'Evaluating stale findings' },
      { stepId: 'dismiss_stale_findings', label: 'Dismissing stale findings' },
      { stepId: 'persist_findings', label: 'Persisting findings' },
      { stepId: 'output_findings', label: 'Preparing results' },
    ],
  },
  {
    id: RULE_DOCTOR_STALE_RULES_WORKFLOW_ID,
    yaml: STALE_RULES_WORKFLOW_YAML,
    insightType: 'stale_rule',
    label: 'Stale Rules',
    analyzeStepId: 'detect_stale_rules',
    stepOrder: [
      { stepId: 'detect_stale_rules', label: 'Detecting stale rules' },
      { stepId: 'validate_rules', label: 'Validating proposed rules' },
      { stepId: 'correction_loop', label: 'Correcting invalid rules' },
      { stepId: 'fetch_open_findings', label: 'Fetching existing findings' },
      { stepId: 'evaluate_existing', label: 'Evaluating stale findings' },
      { stepId: 'dismiss_stale_findings', label: 'Dismissing stale findings' },
      { stepId: 'persist_findings', label: 'Persisting findings' },
      { stepId: 'output_findings', label: 'Preparing results' },
    ],
  },
  {
    id: RULE_DOCTOR_COVERAGE_GAP_WORKFLOW_ID,
    yaml: COVERAGE_GAP_WORKFLOW_YAML,
    insightType: 'coverage_gap',
    label: 'Coverage Gap',
    analyzeStepId: 'analyze_coverage',
    stepOrder: [
      { stepId: 'analyze_coverage', label: 'Analyzing coverage gaps' },
      { stepId: 'validate_rules', label: 'Validating proposed rules' },
      { stepId: 'correction_loop', label: 'Correcting invalid rules' },
      { stepId: 'fetch_open_findings', label: 'Fetching existing findings' },
      { stepId: 'evaluate_existing', label: 'Evaluating stale findings' },
      { stepId: 'dismiss_stale_findings', label: 'Dismissing stale findings' },
      { stepId: 'persist_findings', label: 'Persisting findings' },
      { stepId: 'output_findings', label: 'Preparing results' },
    ],
  },
];

export const ALL_WORKFLOW_IDS = WORKFLOW_DEFINITIONS.map((def) => def.id);

function getWorkflowDefinition(workflowId: string): WorkflowDefinition | undefined {
  return WORKFLOW_DEFINITIONS.find((def) => def.id === workflowId);
}

function extractStepDetail(stepId: string, step: WorkflowStepExecutionDto): string | null {
  if (step.status !== 'completed' || !step.output) return null;
  const output = step.output as Record<string, unknown>;

  const analyzeStepIds = WORKFLOW_DEFINITIONS.map((def) => def.analyzeStepId);
  if (analyzeStepIds.includes(stepId)) {
    const content = output.content as Record<string, unknown> | undefined;
    const findings =
      content?.findings ??
      (content?.response as Record<string, unknown> | undefined)?.findings;
    if (Array.isArray(findings)) {
      return findings.length > 0
        ? `Found ${findings.length} potential ${findings.length === 1 ? 'issue' : 'issues'}`
        : 'No issues found';
    }
  }

  if (stepId === 'validate_rules') {
    const validRules = output.validRules;
    const invalidRules = output.invalidRules;
    const validCount = Array.isArray(validRules) ? validRules.length : 0;
    const invalidCount = Array.isArray(invalidRules) ? invalidRules.length : 0;
    if (invalidCount === 0) {
      return `All ${validCount} ${validCount === 1 ? 'rule' : 'rules'} valid`;
    }
    return `${invalidCount} invalid ${invalidCount === 1 ? 'rule' : 'rules'}, ${validCount} valid`;
  }

  if (stepId === 'correction_loop') {
    return 'Agentic correction completed';
  }

  if (stepId === 'evaluate_existing') {
    const content = output.content as Record<string, unknown> | undefined;
    const dismissals = content?.dismissals;
    if (Array.isArray(dismissals)) {
      return dismissals.length > 0
        ? `Dismissing ${dismissals.length} stale ${dismissals.length === 1 ? 'finding' : 'findings'}`
        : 'No stale findings to dismiss';
    }
  }

  return null;
}

function buildStepProgress(
  stepExecutions: WorkflowStepExecutionDto[],
  stepOrder: Array<{ stepId: string; label: string }>
): RuleDoctorStepProgress[] {
  const stepMap = new Map<string, WorkflowStepExecutionDto>();
  for (const step of stepExecutions) {
    stepMap.set(step.stepId, step);
  }

  return stepOrder.map(({ stepId, label }) => {
    const step = stepMap.get(stepId);
    if (!step) {
      return { stepId, status: 'pending', label, detail: null, error: null };
    }
    return {
      stepId,
      status: step.status as string,
      label,
      detail: extractStepDetail(stepId, step),
      error: step.error?.message ?? null,
    };
  });
}

const RULE_DOCTOR_TRIGGER = 'manual';

export interface RuleDoctorExecutionSummary {
  id: string;
  workflowId: string;
  insightType: InsightType;
  insightLabel: string;
  status: ExecutionStatusUnion;
  startedAt: string;
  finishedAt: string | null;
}

export interface RuleDoctorFinding {
  id: string;
  type: string;
  action: string;
  risk: 'low' | 'medium' | 'high';
  confidence: 'low' | 'medium' | 'high';
  summary: string;
  ruleIds: string[];
  details: Record<string, unknown>;
  current: Record<string, unknown> | null;
  proposed: Record<string, unknown> | null;
  diffs: Array<{ field: string; previous: unknown; proposed: unknown }>;
  explanation: string;
}

export interface RuleDoctorStepProgress {
  stepId: string;
  status: string;
  label: string;
  detail: string | null;
  error: string | null;
}

export interface RuleDoctorExecutionDetail extends RuleDoctorExecutionSummary {
  findings: RuleDoctorFinding[];
  steps: RuleDoctorStepProgress[];
  error: string | null;
}

export interface RuleDoctorWorkflowService {
  ensureWorkflow(params: { request: KibanaRequest }): Promise<void>;
  ensureWorkflows(params: { request: KibanaRequest }): Promise<void>;
  runAnalysis(params: {
    request: KibanaRequest;
    rules: unknown[];
    spaceId?: string;
  }): Promise<string>;
  runAllAnalyses(params: {
    request: KibanaRequest;
    rules: unknown[];
    spaceId?: string;
  }): Promise<string[]>;
  getLatestExecution(params: {
    spaceId?: string;
  }): Promise<RuleDoctorExecutionSummary | null>;
  listExecutions(params: { spaceId?: string }): Promise<RuleDoctorExecutionSummary[]>;
  getExecution(params: {
    executionId: string;
    spaceId?: string;
  }): Promise<RuleDoctorExecutionDetail | null>;
}

export const createRuleDoctorWorkflowService = (
  logger: Logger,
  managementApi: WorkflowsServerPluginSetup['management']
): RuleDoctorWorkflowService => {
  const log = logger.get('rule-doctor-workflow');

  const ensureSingleWorkflow = async (
    def: WorkflowDefinition,
    request: KibanaRequest
  ): Promise<void> => {
    const existing = await managementApi.getWorkflow(def.id, DEFAULT_SPACE_ID);

    if (existing) {
      if (existing.yaml !== def.yaml || !existing.enabled || !existing.valid) {
        const result = await managementApi.updateWorkflow(
          def.id,
          { yaml: def.yaml, enabled: true } as Partial<EsWorkflow>,
          DEFAULT_SPACE_ID,
          request
        );
        if (result.validationErrors && result.validationErrors.length > 0) {
          log.error(
            `Rule Doctor ${def.label} workflow YAML validation errors: ${result.validationErrors.join('; ')}`
          );
        }
        log.info(
          `Updated Rule Doctor ${def.label} workflow YAML — enabled: ${result.enabled}, valid: ${result.valid}`
        );
      } else {
        log.debug(() => `Rule Doctor ${def.label} workflow is up-to-date and enabled, no-op`);
      }
      return;
    }

    await managementApi.createWorkflow(
      { yaml: def.yaml, id: def.id },
      DEFAULT_SPACE_ID,
      request
    );

    log.info(`Created Rule Doctor ${def.label} workflow ${def.id}`);
  };

  const scheduleWorkflow = async (
    def: WorkflowDefinition,
    request: KibanaRequest,
    rules: unknown[],
    spaceId: string
  ): Promise<string> => {
    const workflow = await managementApi.getWorkflow(def.id, DEFAULT_SPACE_ID);

    if (!workflow) {
      throw new Error(`Rule Doctor workflow ${def.id} not found after ensure`);
    }

    const model: WorkflowExecutionEngineModel = {
      id: workflow.id,
      name: workflow.name,
      enabled: true,
      definition: workflow.definition ?? undefined,
      yaml: workflow.yaml,
    };

    const executionId = await managementApi.scheduleWorkflow(
      model,
      spaceId,
      { rules, space_id: spaceId },
      request,
      RULE_DOCTOR_TRIGGER
    );

    log.info(
      `Scheduled Rule Doctor ${def.label} analysis with ${rules.length} rules, execution ID: ${executionId}`
    );

    return executionId;
  };

  return {
    async ensureWorkflow({ request }) {
      await ensureSingleWorkflow(WORKFLOW_DEFINITIONS[0], request);
    },

    async ensureWorkflows({ request }) {
      await Promise.all(WORKFLOW_DEFINITIONS.map((def) => ensureSingleWorkflow(def, request)));
    },

    async runAnalysis({ request, rules, spaceId = DEFAULT_SPACE_ID }) {
      await this.ensureWorkflows({ request });
      return scheduleWorkflow(WORKFLOW_DEFINITIONS[0], request, rules, spaceId);
    },

    async runAllAnalyses({ request, rules, spaceId = DEFAULT_SPACE_ID }) {
      await this.ensureWorkflows({ request });

      const results = await Promise.allSettled(
        WORKFLOW_DEFINITIONS.map((def) => scheduleWorkflow(def, request, rules, spaceId))
      );

      const executionIds: string[] = [];
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled') {
          executionIds.push(result.value);
        } else {
          log.error(
            `Failed to schedule Rule Doctor ${WORKFLOW_DEFINITIONS[i].label} workflow: ${result.reason}`
          );
        }
      }

      return executionIds;
    },

    async getLatestExecution({ spaceId = DEFAULT_SPACE_ID }) {
      const allResults = await Promise.all(
        WORKFLOW_DEFINITIONS.map(async (def) => {
          const list = await managementApi.getWorkflowExecutions(
            { workflowId: def.id, size: 1 },
            spaceId
          );
          return list.results.map((exec) => ({
            id: exec.id,
            workflowId: def.id,
            insightType: def.insightType,
            insightLabel: def.label,
            status: exec.status as ExecutionStatusUnion,
            startedAt: exec.startedAt,
            finishedAt: exec.finishedAt ?? null,
          }));
        })
      );

      const merged = allResults.flat();
      if (merged.length === 0) return null;

      merged.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      return merged[0];
    },

    async listExecutions({ spaceId = DEFAULT_SPACE_ID }) {
      const allResults = await Promise.all(
        WORKFLOW_DEFINITIONS.map(async (def) => {
          const list = await managementApi.getWorkflowExecutions(
            { workflowId: def.id, size: 50 },
            spaceId
          );
          return list.results.map((exec) => ({
            id: exec.id,
            workflowId: def.id,
            insightType: def.insightType,
            insightLabel: def.label,
            status: exec.status as ExecutionStatusUnion,
            startedAt: exec.startedAt,
            finishedAt: exec.finishedAt ?? null,
          }));
        })
      );

      const merged = allResults.flat();
      merged.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      return merged;
    },

    async getExecution({ executionId, spaceId = DEFAULT_SPACE_ID }) {
      const exec = await managementApi.getWorkflowExecution(executionId, spaceId, {
        includeOutput: true,
      });

      if (!exec) {
        return null;
      }

      const def =
        (exec.workflowId ? getWorkflowDefinition(exec.workflowId) : undefined) ??
        WORKFLOW_DEFINITIONS[0];

      let findings: RuleDoctorFinding[] = [];
      const outputStep = exec.stepExecutions.find((s) => s.stepId === 'output_findings');
      if (outputStep?.output) {
        try {
          const output = outputStep.output as Record<string, unknown>;
          let raw = output.findings;
          if (typeof raw === 'string') {
            raw = JSON.parse(raw);
          }
          if (Array.isArray(raw)) {
            findings = raw as RuleDoctorFinding[];
          }
        } catch (e) {
          log.warn(`Failed to parse Rule Doctor findings from execution ${executionId}: ${e}`);
        }
      }

      return {
        id: exec.id,
        workflowId: def.id,
        insightType: def.insightType,
        insightLabel: def.label,
        status: exec.status as ExecutionStatusUnion,
        startedAt: exec.startedAt,
        finishedAt: exec.finishedAt ?? null,
        error: exec.error?.message ?? null,
        findings,
        steps: buildStepProgress(exec.stepExecutions, def.stepOrder),
      };
    },
  };
};
