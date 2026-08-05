/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateActionPolicyWorkflow } from '@kbn/alerting-v2-plugin/server';
import { scanForTemplateVariables, WorkflowSchemaForAutocomplete } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
import { parse as parseYaml } from 'yaml';

/**
 * The lenient workflow shape, it describes the document's structure
 * without rejecting connector-specific step configuration the way
 * the strict `WorkflowSchema` would.
 */
type ParsedWorkflow = z.output<typeof WorkflowSchemaForAutocomplete>;

/**
 * Asserts that an action-policy notification workflow can actually deliver its
 * notification, using the same checks the `manage_action_policy` tool runs at
 * runtime: the YAML parses as a workflow document, its Liquid is valid, and it
 * reads alert data from `inputs.payload` fields the dispatch payload carries.
 *
 * Only `error`-severity diagnostics fail the eval. Warnings (unexpected triggers,
 * disabled workflows) are assertions individual specs opt into, since the tool
 * itself lets them through.
 */
export const assertActionPolicyWorkflowLiquid = (
  yaml: string | undefined
): {
  /** Unique Liquid variable paths extracted from the workflow YAML. */
  variables: string[];
  /** The parsed workflow document, for assertions on triggers, steps, etc. */
  workflow: ParsedWorkflow;
  /** The validated workflow YAML string. */
  yaml: string;
} => {
  if (typeof yaml !== 'string') {
    throw new Error('Expected workflow yaml attachment');
  }

  const errors = validateActionPolicyWorkflow(yaml).filter(({ severity }) => severity === 'error');
  if (errors.length > 0) {
    throw new Error(errors.map(({ message }) => message).join(' '));
  }

  // The validator only reports diagnostics, so re-derive the document and variables
  // the specs assert on. Both are known parseable because validation found no errors.
  const parsed = parseYaml(yaml);

  return {
    variables: Array.from(new Set(scanForTemplateVariables(parsed))).sort(),
    workflow: WorkflowSchemaForAutocomplete.parse(parsed),
    yaml,
  };
};
