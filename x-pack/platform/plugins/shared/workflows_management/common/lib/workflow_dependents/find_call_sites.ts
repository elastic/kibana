/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Output, toValueSync } from 'liquidjs';
import { isEqual } from 'lodash';
import { getKqlFieldNamesFromExpression } from '@kbn/es-query';
import { getNestedStepGroups, type WorkflowStep } from '@kbn/workflows';
import { createWorkflowLiquidEngine, extractTemplateVariables } from '@kbn/workflows/common/utils';
import { parsePath } from '@kbn/workflows/common/utils/zod';
import { isDynamicValue, isRecord } from '@kbn/workflows-yaml';
import type { WorkflowCallSite, WorkflowExecuteStepType } from './types';
import { WORKFLOW_EXECUTE_TYPES, WORKFLOW_REFERENCE_KEY } from '../import';

/** Whether a step is a `workflow.output` that completes the run; `failed` and `cancelled` fail the call. */
export const isCompletingOutputStep = (step: Record<string, unknown>): boolean =>
  step.type === 'workflow.output' && (step.status === undefined || step.status === 'completed');

/** True for values rendered at runtime (`{{ }}`, `{% %}` or `${{ }}`), which cannot be checked statically. */
export const isTemplatedValue = (value: unknown): boolean =>
  typeof value === 'string' &&
  (value.includes('{{') || value.includes('{%') || isDynamicValue(value));

/** True for `{{ }}` / `{% %}` templates, which always render to a string; `${{ }}` keeps the type. */
export const isTextTemplate = (value: unknown): boolean =>
  isTemplatedValue(value) && !isDynamicValue(value);

const getSteps = (definition: unknown): unknown =>
  isRecord(definition) ? definition.steps : undefined;

// The engine sends no inputs for a value that isn't an object, and a list's items by index.
const toCheckedInputs = (inputs: unknown): Record<string, unknown> | undefined => {
  if (isRecord(inputs)) {
    return inputs;
  }
  return Array.isArray(inputs) ? { ...inputs } : undefined;
};

/** The call a step makes, when it runs a workflow with a static `workflow-id`. */
export const toCallSite = (step: Record<string, unknown>): WorkflowCallSite | undefined => {
  const { type, name, with: withBlock } = step;
  if (typeof type !== 'string' || !WORKFLOW_EXECUTE_TYPES.has(type) || !isRecord(withBlock)) {
    return undefined;
  }
  const workflowId = withBlock[WORKFLOW_REFERENCE_KEY];
  if (typeof workflowId !== 'string' || workflowId.length === 0 || isTemplatedValue(workflowId)) {
    return undefined;
  }
  const { inputs } = withBlock;
  return {
    workflowId,
    stepName: typeof name === 'string' ? name : '',
    stepType: type as WorkflowExecuteStepType,
    inputs: toCheckedInputs(inputs),
    // Only an expression keeps its type; a `{{ }}` template renders to text, which sends no inputs.
    isDynamicInputs: isDynamicValue(inputs),
  };
};

type StepVisitor = (step: Record<string, unknown>) => void;

const isWorkflowStep = (node: unknown): node is WorkflowStep =>
  isRecord(node) && typeof node.type === 'string';

const walkSteps = (steps: unknown, visit: StepVisitor): void => {
  if (!Array.isArray(steps)) {
    return;
  }
  for (const step of steps.filter(isWorkflowStep)) {
    visit(step);
    for (const { steps: nestedSteps } of getNestedStepGroups(step)) {
      walkSteps(nestedSteps, visit);
    }
  }
};

export const getWorkflowOnFailure = (definition: unknown): unknown =>
  isRecord(definition) && isRecord(definition.settings)
    ? definition.settings['on-failure']
    : undefined;

// The workflow's steps, then the fallback steps its `settings.on-failure` runs when it fails.
const walkDefinitionSteps = (definition: unknown, visit: StepVisitor): void => {
  const onFailure = getWorkflowOnFailure(definition);
  walkSteps(getSteps(definition), visit);
  walkSteps(isRecord(onFailure) ? onFailure.fallback : undefined, visit);
};

// `continue` (unless it is `false`) keeps a failure from failing the run, including a failure in
// the fallback it wraps.
const canContinue = (onFailure: unknown): boolean =>
  isRecord(onFailure) && onFailure.continue !== undefined && onFailure.continue !== false;

const mayCompleteRun = (steps: unknown): boolean => {
  let mayComplete = false;
  walkSteps(steps, (step) => {
    mayComplete ||= isCompletingOutputStep(step);
  });
  return mayComplete;
};

const LOOP_STEP_TYPES = new Set(['foreach', 'while']);

// The body of a loop, and the fallback of its iterations, run inside it, so `loop.break` and
// `loop.continue` there leave that loop. The fallback of its own `on-failure` runs outside it.
const isInsideLoop = (step: Record<string, unknown>, pathSuffix: string): boolean =>
  typeof step.type === 'string' &&
  LOOP_STEP_TYPES.has(step.type) &&
  pathSuffix !== '.on-failure.fallback';

// The engine fails the step again once its fallback has run, unless the fallback completed the run
// or left the loop iteration around the step first.
const mayEndBeforeFailing = (steps: unknown): boolean =>
  Array.isArray(steps) &&
  steps
    .filter(isWorkflowStep)
    .some(
      (step) =>
        isCompletingOutputStep(step) ||
        step.type === 'loop.break' ||
        step.type === 'loop.continue' ||
        getNestedStepGroups(step).some(({ pathSuffix, steps: nestedSteps }) =>
          isInsideLoop(step, pathSuffix)
            ? mayCompleteRun(nestedSteps)
            : mayEndBeforeFailing(nestedSteps)
        )
    );

// Whether an `on-failure` block can keep a failure from failing the run.
const canRecover = (onFailure: unknown): boolean =>
  canContinue(onFailure) || (isRecord(onFailure) && mayEndBeforeFailing(onFailure.fallback));

// A step whose handlers cover the steps it holds, and itself.
const coversFailures = (step: Record<string, unknown>): boolean =>
  canRecover(step['on-failure']) ||
  canRecover(step['iteration-on-failure']) ||
  (step.type === 'parallel' && step.mode === 'settled');

// What covers the steps of a step's fallback: the `continue` around it, and for the fallback of a
// loop iteration, the step's own `on-failure` around the whole loop.
const coversFallback = (step: Record<string, unknown>, pathSuffix: string): boolean =>
  pathSuffix === '.iteration-on-failure.fallback'
    ? canContinue(step['iteration-on-failure']) || canRecover(step['on-failure'])
    : canContinue(step['on-failure']);

const hasOwnOnFailure = (step: Record<string, unknown>): boolean =>
  step['on-failure'] !== undefined;

const isFallbackGroup = (pathSuffix: string): boolean => pathSuffix.endsWith('.fallback');

// Whether `stepName` is in `steps`, under a handler that might recover from its failure. The
// workflow-level handler applies to each step without its own `on-failure`, outside fallbacks.
const findCoverage = (
  steps: unknown,
  stepName: string,
  covered: boolean,
  workflowCovers: boolean
): boolean | undefined => {
  if (!Array.isArray(steps)) {
    return undefined;
  }
  for (const step of steps.filter(isWorkflowStep)) {
    const coveredHere = covered || coversFailures(step);
    if (step.name === stepName) {
      return coveredHere || (workflowCovers && !hasOwnOnFailure(step));
    }
    for (const { pathSuffix, steps: nestedSteps } of getNestedStepGroups(step)) {
      const found = isFallbackGroup(pathSuffix)
        ? findCoverage(nestedSteps, stepName, covered || coversFallback(step, pathSuffix), false)
        : findCoverage(nestedSteps, stepName, coveredHere, workflowCovers);
      if (found !== undefined) {
        return found;
      }
    }
  }
  return undefined;
};

/**
 * Whether a failure of step `stepName` might not fail the run: an `on-failure` handler on it, on a
 * step that holds it, or on the workflow could recover from it. Read from the YAML, so it doesn't
 * tell whether the handler does.
 */
export const mayRecoverFromFailure = (definition: unknown, stepName: string): boolean => {
  const onFailure = getWorkflowOnFailure(definition);
  return (
    findCoverage(getSteps(definition), stepName, false, canRecover(onFailure)) ??
    findCoverage(
      isRecord(onFailure) ? onFailure.fallback : undefined,
      stepName,
      canContinue(onFailure),
      false
    ) ??
    false
  );
};

/** Returns every static `workflow.execute` / `workflow.executeAsync` call in a workflow definition. */
export const collectWorkflowCallSites = (definition: unknown): WorkflowCallSite[] => {
  const callSites: WorkflowCallSite[] = [];
  walkDefinitionSteps(definition, (step) => {
    const callSite = toCallSite(step);
    if (callSite) {
      callSites.push(callSite);
    }
  });
  return callSites;
};

/** Returns the distinct IDs of the workflows a definition runs with a static `workflow-id`. */
export const getCalledWorkflowIds = (definition: unknown): string[] => [
  ...new Set(collectWorkflowCallSites(definition).map(({ workflowId }) => workflowId)),
];

/** Collects the `with` maps of every completing `workflow.output` step in a workflow definition. */
export const collectWorkflowOutputBlocks = (
  definition: unknown
): Array<Record<string, unknown>> => {
  const blocks: Array<Record<string, unknown>> = [];
  walkDefinitionSteps(definition, (step) => {
    if (isCompletingOutputStep(step) && isRecord(step.with)) {
      blocks.push(step.with);
    }
  });
  return blocks;
};

/**
 * Names the completing `workflow.output` steps set; undefined when there is none or one of them is
 * computed.
 */
export const getOutputStepNames = (definition: unknown): string[] | undefined => {
  const names = new Set<string>();
  let hasOutputStep = false;
  let isComputed = false;
  walkDefinitionSteps(definition, (step) => {
    if (!isCompletingOutputStep(step)) {
      return;
    }
    hasOutputStep = true;
    if (isRecord(step.with)) {
      Object.keys(step.with).forEach((name) => names.add(name));
    } else {
      isComputed = true;
    }
  });
  return hasOutputStep && !isComputed ? [...names] : undefined;
};

export interface OutputUsage {
  /** Top-level output field; empty string when the whole output object is referenced. */
  field: string;
  /** True when every reference passes through a `| default:` filter, so a missing value is replaced. */
  hasFallback: boolean;
}

interface VariableRead {
  path: readonly string[];
  hasFallback: boolean;
}

// Step types whose `condition` is a KQL expression, where variables are referenced by bare names.
const CONDITION_STEP_TYPES = new Set(['if', 'while']);

const liquid = createWorkflowLiquidEngine({ strictFilters: false, strictVariables: false });

const extractVariables = (template: string): string[] => {
  try {
    return extractTemplateVariables(template);
  } catch {
    // A template that doesn't parse fails when it runs, before reading anything.
    return [];
  }
};

const toReads = (variables: readonly string[], hasFallback: boolean): VariableRead[] =>
  variables.flatMap((variable) => {
    const path = parsePath(variable);
    return path ? [{ path, hasFallback }] : [];
  });

const parseTemplate = (template: string): ReturnType<typeof liquid.parse> | undefined => {
  try {
    return liquid.parse(template);
  } catch {
    return undefined;
  }
};

type LiquidTemplate = NonNullable<ReturnType<typeof parseTemplate>>[number];

// The `{{ }}` outputs with a `default` filter, including those in the body of tags, in order.
const findDefaultedOutputs = (templates: readonly LiquidTemplate[]): Output[] =>
  templates.flatMap((node) => {
    if (node instanceof Output) {
      return node.value.filters.some(({ name }) => name === 'default') ? [node] : [];
    }
    return findDefaultedOutputs(node.children ? toValueSync(node.children(false, true)) : []);
  });

/**
 * Reads in a Liquid template. A read has a fallback when it is the value of a `{{ }}` output with
 * a `default` filter; reads in tag arguments, in filter arguments and in other outputs have none.
 */
const readsInTemplate = (template: string): VariableRead[] => {
  const templates = parseTemplate(template);
  if (!templates) {
    return [];
  }
  const withFallback: string[] = [];
  const withoutFallback: string[] = [];
  let rest = '';
  let restStart = 0;
  for (const node of findDefaultedOutputs(templates)) {
    const { begin, end } = node.token;
    rest += template.slice(restStart, begin);
    restStart = end;
    const { postfix } = node.value.initial;
    const valuePath = postfix.length === 1 ? parsePath(postfix[0].getText()) : null;
    for (const variable of extractVariables(template.slice(begin, end))) {
      (isEqual(parsePath(variable), valuePath) ? withFallback : withoutFallback).push(variable);
    }
  }
  rest += template.slice(restStart);
  return [
    ...toReads(withFallback, true),
    ...toReads([...withoutFallback, ...extractVariables(rest)], false),
  ];
};

const readsInCondition = (condition: string): VariableRead[] => {
  try {
    return toReads(getKqlFieldNamesFromExpression(condition), false);
  } catch {
    return [];
  }
};

// Reads in the Liquid templates anywhere in `value`.
const collectReads = (value: unknown): VariableRead[] => {
  if (typeof value === 'string') {
    return value.includes('{{') || value.includes('{%') ? readsInTemplate(value) : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(collectReads);
  }
  if (isRecord(value)) {
    return Object.values(value).flatMap(collectReads);
  }
  return [];
};

// The conditions an `on-failure` handler evaluates when its step fails.
const getOnFailureConditions = (onFailure: unknown): unknown[] =>
  isRecord(onFailure)
    ? [onFailure.continue, isRecord(onFailure.retry) ? onFailure.retry.condition : undefined]
    : [];

// The KQL conditions the engine evaluates for `step`, other than in its nested steps.
const getStepConditions = (step: Record<string, unknown>): unknown[] => [
  step.if,
  typeof step.type === 'string' && CONDITION_STEP_TYPES.has(step.type) ? step.condition : undefined,
  ...getOnFailureConditions(step['on-failure']),
  ...getOnFailureConditions(step['iteration-on-failure']),
];

const readsInConditions = (conditions: readonly unknown[]): VariableRead[] =>
  conditions.flatMap((condition) =>
    typeof condition === 'string' ? readsInCondition(condition) : []
  );

const toOutputUsages = (reads: readonly VariableRead[], stepName: string): OutputUsage[] => {
  const usages = new Map<string, boolean>();
  for (const { path, hasFallback } of reads) {
    if (path[0] === 'steps' && path[1] === stepName && path[2] === 'output') {
      const field = path[3] ?? '';
      usages.set(field, (usages.get(field) ?? true) && hasFallback);
    }
  }
  return [...usages].map(([field, hasFallback]) => ({ field, hasFallback }));
};

const definitionReadsCache = new WeakMap<object, readonly VariableRead[]>();

const getDefinitionReads = (definition: unknown): readonly VariableRead[] => {
  if (!isRecord(definition)) {
    return [];
  }
  const cached = definitionReadsCache.get(definition);
  if (cached) {
    return cached;
  }
  const onFailure = getWorkflowOnFailure(definition);
  const reads = [
    ...collectReads([definition.steps, onFailure]),
    ...readsInConditions(getOnFailureConditions(onFailure)),
  ];
  walkDefinitionSteps(definition, (step) => {
    reads.push(...readsInConditions(getStepConditions(step)));
  });
  definitionReadsCache.set(definition, reads);
  return reads;
};

/**
 * Returns the top-level output fields a workflow reads from a step via
 * `steps.<stepName>.output.<field>`, in Liquid templates and KQL conditions.
 */
export const findOutputUsages = (definition: unknown, stepName: string): OutputUsage[] =>
  stepName ? toOutputUsages(getDefinitionReads(definition), stepName) : [];

/** A read of a step's outputs; with no `field`, of every output of the step. */
export interface StepOutputRead {
  stepName: string;
  field?: string;
}

// Whether `value` reads any of `reads` without a fallback.
const readsWithoutFallback = (value: unknown, reads: ReadonlyArray<StepOutputRead>): boolean => {
  const valueReads = collectReads(value);
  return reads.some(({ stepName, field }) =>
    toOutputUsages(valueReads, stepName).some(
      (usage) =>
        !usage.hasFallback && (field === undefined || usage.field === '' || usage.field === field)
    )
  );
};

/**
 * Returns the names of a workflow's own outputs (keys of its `workflow.output` steps' `with` maps,
 * `outputBlocks`) whose values read the given step outputs without a fallback. A read with no
 * `field` stands for every output of the step.
 */
export const findOutputsPassingThrough = (
  outputBlocks: ReadonlyArray<Record<string, unknown>>,
  reads: ReadonlyArray<StepOutputRead>
): Set<string> => {
  const passedThrough = new Set<string>();
  for (const block of outputBlocks) {
    for (const [outputName, value] of Object.entries(block)) {
      if (readsWithoutFallback(value, reads)) {
        passedThrough.add(outputName);
      }
    }
  }
  return passedThrough;
};

/**
 * Whether the output a workflow returns when no `workflow.output` step ran, the output of its last
 * step, may come back empty without the given step outputs. That last step is the step, holds it,
 * or reads it. A run ending in an unconditional `workflow.output` never returns it.
 */
export const mayLoseImplicitOutput = (
  definition: unknown,
  reads: ReadonlyArray<StepOutputRead>
): boolean => {
  const steps = getSteps(definition);
  const lastStep = Array.isArray(steps) ? steps[steps.length - 1] : undefined;
  if (
    !isWorkflowStep(lastStep) ||
    (isCompletingOutputStep(lastStep) && lastStep.if === undefined)
  ) {
    return false;
  }
  let holdsReadStep = false;
  walkSteps([lastStep], (step) => {
    holdsReadStep ||= reads.some(({ stepName }) => step.name === stepName);
  });
  return holdsReadStep || readsWithoutFallback(lastStep, reads);
};
