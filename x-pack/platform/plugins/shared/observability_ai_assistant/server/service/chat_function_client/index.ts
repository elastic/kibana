/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { jsonSchemaToZod } from '@n8n/json-schema-to-zod';
import { z } from '@kbn/zod';
import { compact, keyBy } from 'lodash';
import type { Logger } from '@kbn/logging';
import { createToolValidationError } from '@kbn/inference-plugin/common/chat_complete/errors';
import { type FunctionResponse } from '../../../common/functions/types';
import type { Message, ObservabilityAIAssistantScreenContextRequest } from '../../../common/types';
import { filterFunctionDefinitions } from '../../../common/utils/filter_function_definitions';
import type {
  FunctionCallChatFunction,
  FunctionHandler,
  FunctionHandlerRegistry,
  InstructionOrCallback,
  RegisterFunction,
  RegisterInstruction,
} from '../types';
import { registerGetDataOnScreenFunction } from '../../functions/get_data_on_screen';

const toZodSchema = (schema: Record<string, any>): z.ZodTypeAny => {
  const normalized =
    'properties' in schema && !('type' in schema) ? { type: 'object', ...schema } : schema;

  return jsonSchemaToZod(normalized as any) as z.ZodTypeAny;
};

export class ChatFunctionClient {
  private readonly instructions: InstructionOrCallback[] = [];

  private readonly functionRegistry: FunctionHandlerRegistry = new Map();
  private readonly validators: Map<string, z.ZodTypeAny> = new Map();

  private readonly actions: Required<ObservabilityAIAssistantScreenContextRequest>['actions'];

  constructor(private readonly screenContexts: ObservabilityAIAssistantScreenContextRequest[]) {
    this.actions = compact(screenContexts.flatMap((context) => context.actions));

    registerGetDataOnScreenFunction(this, screenContexts);

    this.actions.forEach((action) => {
      if (action.parameters) {
        this.validators.set(action.name, toZodSchema(action.parameters));
      }
    });
  }

  registerFunction: RegisterFunction = (definition, respond) => {
    if (definition.parameters) {
      this.validators.set(definition.name, toZodSchema(definition.parameters));
    }
    this.functionRegistry.set(definition.name, { handler: { definition, respond } });
  };

  registerInstruction: RegisterInstruction = (instruction) => {
    this.instructions.push(instruction);
  };

  validate(name: string, parameters: unknown) {
    const validator = this.validators.get(name)!;
    if (!validator) {
      return;
    }

    try {
      validator.parse(parameters);
    } catch (error) {
      const errorMessage =
        error instanceof z.ZodError
          ? error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
          : error instanceof Error
          ? error.message
          : 'Unknown validation error';

      throw createToolValidationError(`Tool call arguments for ${name} were invalid`, {
        name,
        errorsText: errorMessage,
        arguments: JSON.stringify(parameters),
        toolCalls: [],
      });
    }
  }

  getInstructions(): InstructionOrCallback[] {
    return this.instructions;
  }

  hasAction(name: string) {
    return !!this.actions.find((action) => action.name === name)!;
  }

  getFunctions({
    filter,
  }: {
    filter?: string;
  } = {}): FunctionHandler[] {
    const allFunctions = Array.from(this.functionRegistry.values()).map(({ handler }) => handler);

    const functionsByName = keyBy(allFunctions, (definition) => definition.definition.name);

    const matchingDefinitions = filterFunctionDefinitions({
      filter,
      definitions: allFunctions.map((fn) => fn.definition),
    });

    return matchingDefinitions.map((definition) => functionsByName[definition.name]);
  }

  getActions(): Required<ObservabilityAIAssistantScreenContextRequest>['actions'] {
    return this.actions;
  }

  hasFunction(name: string): boolean {
    return this.functionRegistry.has(name);
  }

  async executeFunction({
    chat,
    name,
    args,
    messages,
    signal,
    logger,
    connectorId,
    simulateFunctionCalling,
  }: {
    chat: FunctionCallChatFunction;
    name: string;
    args: string | undefined;
    messages: Message[];
    signal: AbortSignal;
    logger: Logger;
    connectorId: string;
    simulateFunctionCalling: boolean;
  }): Promise<FunctionResponse> {
    const fn = this.functionRegistry.get(name);

    if (!fn) {
      throw new Error(`Function ${name} not found`);
    }

    const parsedArguments = args ? JSON.parse(args) : {};

    this.validate(name, parsedArguments);

    logger.debug(
      () => `Executing function ${name} with arguments: ${JSON.stringify(parsedArguments)}`
    );

    try {
      return await fn.handler.respond(
        {
          arguments: parsedArguments,
          messages,
          screenContexts: this.screenContexts,
          chat,
          connectorId,
          simulateFunctionCalling,
        },
        signal
      );
    } catch (e) {
      logger.error(`Error executing function "${name}": ${e.message}`);
      logger.error(e);
      throw e;
    }
  }
}
