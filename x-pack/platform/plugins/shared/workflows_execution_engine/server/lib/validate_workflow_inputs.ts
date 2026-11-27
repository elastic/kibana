/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDeepStrictEqual } from 'node:util';
import type { CoreStart, Logger } from '@kbn/core/server';
import {
  evaluatesProvidedInputExpressions,
  ExecutionStatus,
  PAGE_TRIGGER_SOURCE,
} from '@kbn/workflows';
import { buildFieldsZodValidator } from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import {
  applyInputDefaults,
  getInputsFromDefinition,
} from '@kbn/workflows/spec/lib/field_conversion';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import { WorkflowTemplatingEngine } from '../templating_engine';
import { publishFinishedWorkflowExecution } from '../topics/publish_finished_workflow_execution';
import {
  buildInputDefaultRenderContext,
  type WorkflowExecutionForInputRendering,
} from '../workflow_context_manager/build_workflow_context';
import type { ContextDependencies } from '../workflow_context_manager/types';

const hasInputChanges = (
  currentInputs: Record<string, unknown> | undefined,
  nextInputs: Record<string, unknown> | undefined
): boolean => !isDeepStrictEqual(currentInputs, nextInputs);

/**
 * Validates workflow inputs against the workflow's input schema.
 * On failure, marks the execution as FAILED with an InputValidationError.
 *
 * @returns true if inputs are valid and execution can proceed, false if validation failed
 */
export const validateWorkflowInputs = async (
  workflowExecution: WorkflowExecutionForInputRendering,
  workflowExecutionRepository: WorkflowExecutionRepository,
  logger: Logger,
  coreStart?: CoreStart,
  dependencies?: ContextDependencies
): Promise<boolean> => {
  // A page run provides `page.inputs`, not `inputs`. The page route validated them against the
  // page trigger's schema, so the workflow inputs do not apply.
  if (
    !workflowExecution.workflowDefinition ||
    workflowExecution.triggeredBy === PAGE_TRIGGER_SOURCE
  ) {
    return true;
  }
  const normalizedSchema = getInputsFromDefinition(workflowExecution.workflowDefinition);
  const validator = buildFieldsZodValidator(normalizedSchema);
  const additionalProperties = normalizedSchema?.additionalProperties;
  // A typed `additionalProperties` alone still checks undeclared inputs and the keys it requires.
  const hasTypedAdditionalProperties =
    typeof additionalProperties === 'object' &&
    additionalProperties !== null &&
    !Array.isArray(additionalProperties);
  if (!normalizedSchema?.properties && !hasTypedAdditionalProperties) {
    return true;
  }
  const renderContext = buildInputDefaultRenderContext(workflowExecution, coreStart, dependencies);
  const templateEngine = new WorkflowTemplatingEngine({
    liquidSettings: workflowExecution.workflowDefinition.settings?.liquid,
  });

  // Caller-provided values are data. Evaluate only the explicit whole-expression
  // form, and only for a run a person or API caller started directly. Preserve
  // ordinary strings that happen to resemble Liquid templates.
  const evaluatesExpressions = evaluatesProvidedInputExpressions(workflowExecution.triggeredBy);
  const renderProvidedValue = (value: unknown): unknown => {
    if (typeof value === 'string') {
      return evaluatesExpressions && value.startsWith('${{') && value.endsWith('}}')
        ? templateEngine.render(value, renderContext)
        : value;
    }

    if (Array.isArray(value)) {
      return value.map(renderProvidedValue);
    }

    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, nestedValue]) => [key, renderProvidedValue(nestedValue)])
      );
    }

    return value;
  };

  const markInputValidationFailed = async (message: string): Promise<void> => {
    const error = {
      type: 'InputValidationError',
      message,
    };
    const finishedAt = new Date().toISOString();
    const update = {
      id: workflowExecution.id,
      status: ExecutionStatus.FAILED,
      error,
      finishedAt,
    };
    if (workflowExecution.concurrencyGroupKey) {
      await workflowExecutionRepository.updateWorkflowExecution(update, { refresh: true });
    } else {
      await workflowExecutionRepository.updateWorkflowExecution(update);
    }
    await publishFinishedWorkflowExecution(workflowExecution, {
      status: ExecutionStatus.FAILED,
      error,
      finishedAt,
    });
  };

  let inputsWithDefaults: Record<string, unknown> | undefined;
  try {
    inputsWithDefaults = applyInputDefaults(
      renderContext.inputs,
      normalizedSchema,
      (value, source) =>
        source === 'default'
          ? templateEngine.render(value, renderContext)
          : renderProvidedValue(value)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      await markInputValidationFailed(`Workflow input validation failed: ${message}`);
    } catch (updateError) {
      logger.error(
        `Failed to mark execution ${workflowExecution.id} as FAILED after input validation error: ${updateError}`
      );
    }
    return false;
  }
  const result = validator.safeParse(inputsWithDefaults ?? {});
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    try {
      await markInputValidationFailed(`Workflow input validation failed: ${issues}`);
    } catch (updateError) {
      logger.error(
        `Failed to mark execution ${workflowExecution.id} as FAILED after input validation error: ${updateError}`
      );
    }

    return false;
  }

  if (hasInputChanges(renderContext.inputs, inputsWithDefaults)) {
    const context = {
      ...(workflowExecution.context ?? {}),
      ...(inputsWithDefaults !== undefined ? { inputs: inputsWithDefaults } : {}),
    };
    workflowExecution.context = context;
    await workflowExecutionRepository.updateWorkflowExecution({
      id: workflowExecution.id,
      context,
    });
  }

  return true;
};
