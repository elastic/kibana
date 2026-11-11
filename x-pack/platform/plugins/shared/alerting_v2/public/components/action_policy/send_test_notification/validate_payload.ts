/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  actionPolicyWorkflowPayloadSchema,
  type ActionPolicyWorkflowPayloadInput,
} from '@kbn/alerting-v2-schemas';
import { invalidJson, payloadIssue } from './translations';

type PayloadValidation =
  | { payload: ActionPolicyWorkflowPayloadInput; errors: [] }
  | { payload: undefined; errors: string[] };

const parseJson = (text: string): { value: object | null } | { error: string } => {
  try {
    return { value: JSON.parse(text) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
};

/** Parses the payload editor text and validates it against the workflow payload schema. */
export const validatePayload = (text: string): PayloadValidation => {
  const parsed = parseJson(text);
  if ('error' in parsed) {
    return { payload: undefined, errors: [invalidJson(parsed.error)] };
  }

  const result = actionPolicyWorkflowPayloadSchema.safeParse(parsed.value);
  if (result.success) {
    return { payload: result.data, errors: [] };
  }

  return {
    payload: undefined,
    errors: result.error.issues.map(({ path, message }) =>
      path.length > 0 ? payloadIssue(path.join('.'), message) : message
    ),
  };
};
