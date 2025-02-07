/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file*/

import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import dedent from 'dedent';
import { compact, keyBy } from 'lodash';
import { FunctionVisibility, type FunctionResponse } from '../../../common/functions/types';
import type {
  AdHocInstruction,
  Message,
  ObservabilityAIAssistantScreenContextRequest,
} from '../../../common/types';
import { filterFunctionDefinitions } from '../../../common/utils/filter_function_definitions';
import type {
  FunctionCallChatFunction,
  FunctionHandler,
  FunctionHandlerRegistry,
  InstructionOrCallback,
  RegisterAdHocInstruction,
  RegisterFunction,
  RegisterInstruction,
} from '../types';

export class FunctionArgsValidationError extends Error {
  constructor(public readonly errors: ErrorObject[]) {
    super('Function arguments are invalid');
  }
}

const ajv = new Ajv({
  strict: false,
});

export const GET_DATA_ON_SCREEN_FUNCTION_NAME = 'get_data_on_screen';

export class ChatFunctionClient {
  private readonly instructions: InstructionOrCallback[] = [];
  private readonly adhocInstructions: AdHocInstruction[] = [];

  private readonly functionRegistry: FunctionHandlerRegistry = new Map();
  private readonly validators: Map<string, ValidateFunction> = new Map();

  private readonly actions: Required<ObservabilityAIAssistantScreenContextRequest>['actions'];

  constructor(private readonly screenContexts: ObservabilityAIAssistantScreenContextRequest[]) {
    const allData = compact(screenContexts.flatMap((context) => context.data));

    this.actions = compact(screenContexts.flatMap((context) => context.actions));

    if (allData.length) {
      this.registerFunction(
        {
          name: GET_DATA_ON_SCREEN_FUNCTION_NAME,
          description: `Retrieve the structured data of content currently visible on the user's screen. Use this tool to understand what the user is viewing at this moment to provide more accurate and context-aware responses to their questions.`,
          visibility: FunctionVisibility.AssistantOnly,
          parameters: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                description:
                  'The pieces of data you want to look at it. You can request one, or multiple',
                items: {
                  type: 'string',
                  enum: allData.map((data) => data.name),
                },
              },
            },
            required: ['data' as const],
          },
        },
        async ({ arguments: { data: dataNames } }) => {
          return {
            content: allData.filter((data) => dataNames.includes(data.name)),
          };
        }
      );

      this.registerAdhocInstruction({
        text: `The ${GET_DATA_ON_SCREEN_FUNCTION_NAME} function will retrieve specific content from the user's screen by specifying a data key. Use this tool to provide context-aware responses. Available data: ${dedent(
          allData.map((data) => `${data.name}: ${data.description}`).join('\n')
        )}`,
        instruction_type: 'application_instruction',
      });
    }

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

  registerAdhocInstruction: RegisterAdHocInstruction = (instruction: AdHocInstruction) => {
    this.adhocInstructions.push(instruction);
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

  getAdhocInstructions(): AdHocInstruction[] {
    return this.adhocInstructions;
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
    connectorId,
    simulateFunctionCalling,
  }: {
    chat: FunctionCallChatFunction;
    name: string;
    args: string | undefined;
    messages: Message[];
    signal: AbortSignal;
    connectorId: string;
    simulateFunctionCalling: boolean;
  }): Promise<FunctionResponse> {
    const fn = this.functionRegistry.get(name);

    if (!fn) {
      throw new Error(`Function ${name} not found`);
    }

    const parsedArguments = args ? JSON.parse(args) : {};

    this.validate(name, parsedArguments);

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
  }
}
