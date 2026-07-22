/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INFERENCE_PROCEED_CAPABILITY_ID,
  PII_TOKENIZATION_CAPABILITY_ID,
  type InferenceProceedCapability,
  type PiiTokenizationContext,
} from '@kbn/inference-plugin/server';
import type { WorkflowExecutionCapabilities } from '@kbn/workflows-extensions/server';

const getCapabilityValue = (
  capabilities: WorkflowExecutionCapabilities | undefined,
  id: string
): object => {
  const capability = capabilities?.find((entry) => entry.id === id);
  if (!capability) {
    throw new Error(`Workflow step requires the request-local "${id}" capability`);
  }
  return capability.value;
};

const isPiiTokenizationContext = (value: object): value is PiiTokenizationContext =>
  'detectEntities' in value &&
  typeof value.detectEntities === 'function' &&
  'tokenize' in value &&
  typeof value.tokenize === 'function';

const isInferenceProceedCapability = (value: object): value is InferenceProceedCapability =>
  'invoke' in value && typeof value.invoke === 'function';

export const getPiiTokenizationContext = (
  capabilities: WorkflowExecutionCapabilities | undefined
): PiiTokenizationContext => {
  const value = getCapabilityValue(capabilities, PII_TOKENIZATION_CAPABILITY_ID);
  if (!isPiiTokenizationContext(value)) {
    throw new Error(`Workflow capability "${PII_TOKENIZATION_CAPABILITY_ID}" is invalid`);
  }
  return value;
};

export const getInferenceProceedCapability = (
  capabilities: WorkflowExecutionCapabilities | undefined
): InferenceProceedCapability => {
  const value = getCapabilityValue(capabilities, INFERENCE_PROCEED_CAPABILITY_ID);
  if (!isInferenceProceedCapability(value)) {
    throw new Error(`Workflow capability "${INFERENCE_PROCEED_CAPABILITY_ID}" is invalid`);
  }
  return value;
};
