/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  insertStep,
  modifyStep,
  modifyStepProperty,
  deleteStep,
} from '@kbn/workflows-yaml';
import { TOOL_NAMES, type ToolName } from './schemas';
import { lookupStepDefinitions, lookupTriggerDefinitions, type LookupDeps } from './lookup';

export interface ToolMessage {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface DispatchInput {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any;
}

export interface DispatchResult {
  /** New YAML if the tool mutated state; undefined otherwise. */
  yaml?: string;
  message: ToolMessage;
}

export const dispatchToolCall = async (
  state: { yaml: string },
  call: DispatchInput,
  deps: LookupDeps
): Promise<DispatchResult> => {
  switch (call.name as ToolName) {
    case TOOL_NAMES.setYaml: {
      const newYaml = call.args.yaml as string;
      return { yaml: newYaml, message: { success: true, data: { length: newYaml.length } } };
    }
    case TOOL_NAMES.insertStep: {
      const result = insertStep(state.yaml, call.args.step, call.args.insertAfterStep);
      return result.success
        ? { yaml: result.yaml, message: { success: true } }
        : { message: { success: false, error: result.error } };
    }
    case TOOL_NAMES.modifyStep: {
      const result = modifyStep(state.yaml, call.args.stepName, call.args.updatedStep);
      return result.success
        ? { yaml: result.yaml, message: { success: true } }
        : { message: { success: false, error: result.error } };
    }
    case TOOL_NAMES.modifyStepProperty: {
      const result = modifyStepProperty(
        state.yaml,
        call.args.stepName,
        call.args.property,
        call.args.value
      );
      return result.success
        ? { yaml: result.yaml, message: { success: true } }
        : { message: { success: false, error: result.error } };
    }
    case TOOL_NAMES.deleteStep: {
      const result = deleteStep(state.yaml, call.args.stepName);
      return result.success
        ? { yaml: result.yaml, message: { success: true } }
        : { message: { success: false, error: result.error } };
    }
    case TOOL_NAMES.getStepDefinitions: {
      const data = await lookupStepDefinitions(call.args, deps);
      return { message: { success: true, data } };
    }
    case TOOL_NAMES.getTriggerDefinitions: {
      const data = await lookupTriggerDefinitions(call.args);
      return { message: { success: true, data } };
    }
    default:
      return { message: { success: false, error: `Unknown tool: ${call.name}` } };
  }
};
