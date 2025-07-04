/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file*/

import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import { compact, keyBy } from 'lodash';
import { Logger } from '@kbn/logging';
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

export class FunctionArgsValidationError extends Error {
  constructor(public readonly errors: ErrorObject[]) {
    super('Function arguments are invalid');
  }
}

const ajv = new Ajv({
  strict: false,
});

export class ChatFunctionClient {
  private readonly instructions: InstructionOrCallback[] = [];

  private readonly functionRegistry: FunctionHandlerRegistry = new Map();
  private readonly validators: Map<string, ValidateFunction> = new Map();

  private readonly actions: Required<ObservabilityAIAssistantScreenContextRequest>['actions'];

  constructor(private readonly screenContexts: ObservabilityAIAssistantScreenContextRequest[]) {
    this.actions = compact(screenContexts.flatMap((context) => context.actions));

    registerGetDataOnScreenFunction(this, screenContexts);

    this.actions.forEach((action) => {
      if (action.parameters) {
        this.validators.set(action.name, ajv.compile(action.parameters));
      }
    });
  }

  registerFunction: RegisterFunction = (definition, respond) => {
    if (definition.parameters) {
      this.validators.set(definition.name, ajv.compile(definition.parameters));
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

    const result = validator(parameters);
    if (!result) {
      throw new FunctionArgsValidationError(validator.errors!);
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
