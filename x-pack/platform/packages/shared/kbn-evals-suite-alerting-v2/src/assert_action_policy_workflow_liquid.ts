/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scanForTemplateVariables } from '@kbn/workflows';
import { parse as parseYaml } from 'yaml';

/**
 * Liquid roots available when an action policy dispatches a workflow.
 * - `inputs.payload.*` mirrors `ActionPolicyWorkflowPayload`
 * - engine context vars (see action-policy-management skill)
 * - `steps.*` for referencing prior step outputs in multi-step workflows
 */
const ALLOWED_ROOTS = [
  'triggeredBy',
  'spaceId',
  'execution',
  'workflow',
  'kibanaUrl',
  'now',
  'steps',
] as const;

const isUnderPrefix = (path: string, prefix: string): boolean =>
  path === prefix || path.startsWith(`${prefix}.`) || path.startsWith(`${prefix}[`);

/**
 * Returns true when `path` is a known-good Liquid variable for action-policy
 * workflow dispatch (payload fields, engine context, or step outputs).
 */
export const isAllowedActionPolicyLiquidPath = (path: string): boolean => {
  if (path === 'inputs' || isUnderPrefix(path, 'inputs.payload')) {
    return true;
  }
  return ALLOWED_ROOTS.some((root) => isUnderPrefix(path, root));
};

export interface AssertActionPolicyWorkflowLiquidResult {
  /** Unique Liquid variable paths extracted from the workflow YAML. */
  variables: string[];
}

/**
 * Asserts that every Liquid expression in an action-policy notification workflow:
 * 1. Parses as valid Liquid (via `@kbn/workflows` `scanForTemplateVariables`)
 * 2. Only references allowed dispatch/engine paths (`inputs.payload.*`, `execution.*`, etc.)
 *
 * Intended for eval `expectAttachmentData` checks on generated `workflow.yaml`.
 */
export const assertActionPolicyWorkflowLiquid = (
  yaml: string
): AssertActionPolicyWorkflowLiquidResult => {
  let parsed: unknown;
  try {
    parsed = parseYaml(yaml);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Generated workflow YAML is not valid YAML: ${message}`);
  }

  let variables: string[];
  try {
    variables = Array.from(new Set(scanForTemplateVariables(parsed))).sort();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Generated workflow contains invalid Liquid template syntax: ${message}`
    );
  }

  const disallowed = variables.filter((path) => !isAllowedActionPolicyLiquidPath(path));
  if (disallowed.length > 0) {
    throw new Error(
      `Generated workflow Liquid references disallowed variables for action-policy dispatch: ` +
        `${disallowed.map((path) => `\`${path}\``).join(', ')}. ` +
        `Allowed roots: \`inputs.payload.*\`, ${ALLOWED_ROOTS.map((r) => `\`${r}\``).join(', ')}. ` +
        `Do not use v1 paths like \`event.alerts\` / \`event.rule.name\`.`
    );
  }

  return { variables };
};
