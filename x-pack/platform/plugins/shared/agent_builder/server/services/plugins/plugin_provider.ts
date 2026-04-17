/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { PluginDefinition } from '@kbn/agent-builder-common';
import type { PluginCreateRequest, PluginUpdateRequest } from './client';

export interface ReadonlyPluginProvider {
  id: string;
  readonly: true;
  has(pluginId: string): MaybePromise<boolean>;
  get(pluginId: string): MaybePromise<PluginDefinition | undefined>;
  findByName(name: string): MaybePromise<PluginDefinition | undefined>;
  list(): MaybePromise<PluginDefinition[]>;
}

export interface WritablePluginProvider extends Omit<ReadonlyPluginProvider, 'readonly'> {
  readonly: false;
  create(request: PluginCreateRequest): MaybePromise<PluginDefinition>;
  update(pluginId: string, update: PluginUpdateRequest): MaybePromise<PluginDefinition>;
  delete(pluginId: string): MaybePromise<void>;
}

export type PluginProvider = ReadonlyPluginProvider | WritablePluginProvider;

export const isWritableProvider = (
  provider: PluginProvider
): provider is WritablePluginProvider => {
  return !provider.readonly;
};

export const isReadonlyProvider = (
  provider: PluginProvider
): provider is ReadonlyPluginProvider => {
  return provider.readonly;
};
