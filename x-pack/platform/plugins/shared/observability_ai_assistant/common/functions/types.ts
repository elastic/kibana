/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { JSONSchema7TypeName } from 'json-schema';
import type { Observable } from 'rxjs';
import { ChatCompletionChunkEvent, MessageAddEvent } from '../conversation_complete';
import { FunctionVisibility } from './function_visibility';
export { FunctionVisibility };

type JSONSchemaOrPrimitive = CompatibleJSONSchema | string | number | boolean;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CompatibleJSONSchema = {
  type?: JSONSchema7TypeName;
  enum?: JSONSchemaOrPrimitive[] | readonly JSONSchemaOrPrimitive[];
  const?: JSONSchemaOrPrimitive;
  minLength?: number | undefined;
  maxLength?: number | undefined;
  items?: CompatibleJSONSchema[] | CompatibleJSONSchema;
  required?: string[] | readonly string[] | undefined;
  properties?: Record<string, CompatibleJSONSchema>;
  allOf?: CompatibleJSONSchema[] | readonly CompatibleJSONSchema[] | undefined;
  anyOf?: CompatibleJSONSchema[] | readonly CompatibleJSONSchema[] | undefined;
  oneOf?: CompatibleJSONSchema[] | readonly CompatibleJSONSchema[] | undefined;
  description?: string;
};

export type FunctionResponse =
  | {
      content?: any;
      data?: any;
    }
  | Observable<ChatCompletionChunkEvent | MessageAddEvent>;

export interface FunctionDefinition<
  TParameters extends CompatibleJSONSchema = CompatibleJSONSchema
> {
  name: string;
  description: string;
  visibility?: FunctionVisibility;
  descriptionForUser?: string;
  parameters?: TParameters;
}

export type FunctionRegistry = Map<string, FunctionDefinition>;
