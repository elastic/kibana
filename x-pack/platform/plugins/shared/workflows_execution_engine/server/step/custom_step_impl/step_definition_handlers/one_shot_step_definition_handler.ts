/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServerHandlerStepDefinition } from '@kbn/workflows-extensions/server';
import { createBaseHandlerContext } from './create_base_handler_context';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import { toExecutionError } from '../../errors';
import type { RunStepResult } from '../../node_implementation';
import type { CustomStepDefinitionHandler, CustomStepGraphNode } from '../types';

/**
 * Executes a single-shot custom step (`ServerHandlerStepDefinition` with `handler`).
 */
export class OneShotStepDefinitionHandler implements CustomStepDefinitionHandler {
  constructor(
    private readonly stepDefinition: ServerHandlerStepDefinition,
    private readonly node: CustomStepGraphNode,
    private readonly stepExecutionRuntime: StepExecutionRuntime,
    private readonly workflowLogger: IWorkflowEventLogger
  ) {}

  public async onCancel(
    input: unknown,
    rawInput: unknown,
    config: Record<string, unknown>
  ): Promise<void> {
    if (!this.stepDefinition.onCancel) {
      return;
    }

    await this.stepDefinition.onCancel(
      createBaseHandlerContext(
        input,
        rawInput,
        config,
        this.node,
        this.stepExecutionRuntime,
        this.workflowLogger
      )
    );
  }

  public async run(
    input: unknown,
    rawInput: unknown,
    config: Record<string, unknown>
  ): Promise<RunStepResult> {
    const handler = this.stepDefinition.handler;
    if (!handler) {
      throw new Error(`Step "${this.node.stepType}" has no "handler".`);
    }

    const handlerContext = createBaseHandlerContext(
      input,
      rawInput,
      config,
      this.node,
      this.stepExecutionRuntime,
      this.workflowLogger
    );
    const handlerResult = await handler(handlerContext);

    const stepResult: RunStepResult = {
      input,
      output: handlerResult.output,
      error: undefined,
    };

    if (handlerResult.error) {
      stepResult.error = toExecutionError(handlerResult.error).toSerializableObject();
    }

    return stepResult;
  }
}
