/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  InternalToolDefinition,
  ToolCreateParams,
  ToolUpdateParams,
} from '@kbn/agent-builder-server/tools';

export type ToolTypeCreateParams<TConfig extends object = {}> = ToolCreateParams<TConfig>;
export type ToolTypeUpdateParams<TConfig extends object = {}> = ToolUpdateParams<TConfig>;

export interface ReadonlyToolProvider {
  id: string;
  readonly: true;
  has(toolId: string): MaybePromise<boolean>;
  get(toolId: string): MaybePromise<InternalToolDefinition>;
  list(): MaybePromise<Array<InternalToolDefinition>>;
}

export interface WritableToolProvider extends Omit<ReadonlyToolProvider, 'readonly'> {
  readonly: false;
  create(params: ToolTypeCreateParams): MaybePromise<InternalToolDefinition>;
  update(toolId: string, update: ToolTypeUpdateParams): MaybePromise<InternalToolDefinition>;
  delete(toolId: string): MaybePromise<boolean>;
}

export type ToolProviderFn<Readonly extends boolean> = (opts: {
  request: KibanaRequest;
  space: string;
}) => MaybePromise<Readonly extends true ? ReadonlyToolProvider : WritableToolProvider>;

export type ToolProvider = ReadonlyToolProvider | WritableToolProvider;

export const isReadonlyToolProvider = (
  provider: ToolProvider
): provider is ReadonlyToolProvider => {
  return provider.readonly;
};

export const isWritableToolProvider = (
  provider: ToolProvider
): provider is WritableToolProvider => {
  return !provider.readonly;
};
