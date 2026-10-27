/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esManifest } from '@elastic/schemas/es/tools/manifest.js';
import { kibanaManifest } from '@elastic/schemas/kibana/tools/manifest.js';
import type { ApiTarget, AutoApprovedApi, InteractivityConfig } from '@kbn/agent-builder-common';
import { isApiAutoApproved } from '@kbn/agent-builder-common';
import { getConnectorSpec } from '@kbn/connector-specs';
import { LineCounter, parseDocument, stringify, visit } from 'yaml';
import { buildWorkflowLookup, type StepInfo } from '@kbn/workflows-yaml';

export interface StepRisk {
  /** True when the step runs without a confirmation dialog. */
  safe: boolean;
  /** True when the step deletes or mutates existing data; the dialog uses the danger color. */
  destructive: boolean;
  /** The registry API the step calls. Matches `execute_api` auto-approval selectors. */
  api?: AutoApprovedApi;
}

const SAFE: StepRisk = { safe: true, destructive: false };
const UNSAFE: StepRisk = { safe: false, destructive: false };
const DESTRUCTIVE: StepRisk = { safe: false, destructive: true };

/** Steps with no `@elastic/schemas` entry, audited by hand. */
const HANDWRITTEN_RISKS: ReadonlyMap<string, StepRisk> = new Map(
  Object.entries({
    console: SAFE,
    'data.set': SAFE,
    'data.map': SAFE,
    'data.filter': SAFE,
    'data.find': SAFE,
    'data.dedupe': SAFE,
    'data.aggregate': SAFE,
    'data.concat': SAFE,
    'data.parseJson': SAFE,
    'data.regexExtract': SAFE,
    'data.regexReplace': SAFE,
    'data.stringifyJson': SAFE,
    if: SAFE,
    foreach: SAFE,
    while: SAFE,
    wait: SAFE,
    waitForInput: SAFE,
    waitForApproval: SAFE,
    switch: SAFE,
    parallel: SAFE,
    merge: SAFE,
    'loop.break': SAFE,
    'loop.continue': SAFE,
    'workflow.output': SAFE,
    'workflow.fail': SAFE,
    'cases.getCase': SAFE,
    'cases.getCases': SAFE,
    'cases.findCases': SAFE,
    'cases.findSimilarCases': SAFE,
    'cases.getAllAttachments': SAFE,
    'cases.getCasesByAlertId': SAFE,
    'cases.deleteCases': DESTRUCTIVE,
    'cases.deleteObservable': DESTRUCTIVE,
    'cases.bulkDeleteObservables': DESTRUCTIVE,
  })
);

/**
 * Registry API for each generated `kibana.*` step. Hand-maintained until the steps
 * move to `@elastic/schemas` (elastic/security-team#20272); a unit test checks it
 * against the registry method and path.
 */
export const KIBANA_STEP_APIS: ReadonlyMap<string, string> = new Map(
  Object.entries({
    'kibana.addCaseComment': 'cases.add-case-comment',
    'kibana.createCase': 'cases.create-case',
    'kibana.getCase': 'cases.get-case',
    'kibana.updateCase': 'cases.update-case',
    'kibana.SetAlertsStatus': 'security-detections-api.set-alerts-status',
    'kibana.SetAlertTags': 'security-detections-api.set-alert-tags',
    'kibana.streams.get': 'streams.get-streams-name',
    'kibana.streams.list': 'streams.get-streams',
  })
);

const ES_STEP_PREFIX = 'elasticsearch.';
const esEntries = new Map(esManifest.map((entry) => [entry.id, entry] as const));
const kibanaEntries = new Map(kibanaManifest.map((entry) => [entry.id, entry] as const));

const fromRegistry = (
  target: ApiTarget,
  entry: { id: string; destructive: boolean } | undefined
): StepRisk | undefined =>
  entry && {
    safe: !entry.destructive,
    destructive: entry.destructive,
    api: { target, api: entry.id },
  };

/**
 * Connector-backed steps are typed `<connectorType>.<actionName>`. The spec
 * classifies each action as `read` / `write` / `destroy`; an omitted scope fails closed.
 */
const fromConnectorSpec = (stepType: string): StepRisk | undefined => {
  const [connectorType, ...action] = stepType.split('.');
  const scope = getConnectorSpec(`.${connectorType}`)?.actions?.[action.join('.')]?.scope;
  return scope && { safe: scope === 'read', destructive: scope === 'destroy' };
};

const fromRegistries = (stepType: string): StepRisk | undefined => {
  if (stepType.startsWith(ES_STEP_PREFIX)) {
    return fromRegistry('elasticsearch', esEntries.get(stepType.slice(ES_STEP_PREFIX.length)));
  }
  const kibanaApi = KIBANA_STEP_APIS.get(stepType);
  return kibanaApi === undefined
    ? fromConnectorSpec(stepType)
    : fromRegistry('kibana', kibanaEntries.get(kibanaApi));
};

/**
 * Classifies a step type with the same `destructive` flag `execute_api` uses, so
 * both tools ask for confirmation on the same operations. Unknown steps fail closed.
 */
export const getStepRisk = (stepType: string): StepRisk =>
  HANDWRITTEN_RISKS.get(stepType) ?? fromRegistries(stepType) ?? UNSAFE;

export interface UnsafeStep {
  step: StepInfo;
  risk: StepRisk;
}

/**
 * Returns the steps that need confirmation, in workflow order. A step the run
 * pre-approved through `auto_approved_apis` does not need it.
 */
export const findUnsafeSteps = (
  steps: StepInfo[],
  interactivity: InteractivityConfig
): UnsafeStep[] =>
  steps
    .map((step) => ({ step, risk: getStepRisk(step.stepType) }))
    .filter(
      ({ risk }) => !risk.safe && !(risk.api && isApiAutoApproved({ interactivity, ...risk.api }))
    );

/**
 * Expands YAML aliases, so a step lookup sees the same step names and types the
 * workflow runs with. The workflow parser resolves aliases; the lookup does not.
 * Returns an error for a recursive alias or too many aliases.
 */
export const resolveYamlAliases = (yaml: string): { yaml: string } | { error: string } => {
  const doc = parseDocument(yaml);
  let hasAlias = false;
  visit(doc, {
    Alias: () => {
      hasAlias = true;
      return visit.BREAK;
    },
  });
  if (!hasAlias || doc.errors.length > 0) {
    return { yaml };
  }
  try {
    // By default `stringify` writes shared objects back as aliases; write each copy in full.
    return {
      yaml: stringify(doc.toJS({ maxAliasCount: 100 }), { aliasDuplicateObjects: false }),
    };
  } catch (error) {
    return {
      error:
        error instanceof RangeError
          ? 'Workflow YAML has a recursive alias.'
          : `Workflow YAML aliases cannot be expanded: ${error.message}`,
    };
  }
};

/**
 * Parses workflow YAML into its steps. Returns an empty list when the YAML does not
 * parse, and an error when its aliases cannot be expanded.
 */
export const getWorkflowSteps = (yaml: string): { steps: StepInfo[] } | { error: string } => {
  const resolved = resolveYamlAliases(yaml);
  if ('error' in resolved) {
    return resolved;
  }
  const lineCounter = new LineCounter();
  const doc = parseDocument(resolved.yaml, { lineCounter });
  if (doc.errors.length > 0) {
    return { steps: [] };
  }
  return { steps: Object.values(buildWorkflowLookup(doc, lineCounter).steps) };
};
