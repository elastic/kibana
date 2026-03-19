/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginDefinition } from '@kbn/agent-builder-common';
import { createBadRequestError, createPluginNotFoundError } from '@kbn/agent-builder-common';
import type {
  ReadonlyPluginProvider,
  WritablePluginProvider,
  PluginProvider,
} from './plugin_provider';
import { isReadonlyProvider } from './plugin_provider';
import type { PluginCreateRequest, PluginUpdateRequest } from './client';

export interface PluginRegistry {
  has(pluginId: string): Promise<boolean>;
  get(pluginId: string): Promise<PluginDefinition>;
  list(): Promise<PluginDefinition[]>;
  create(request: PluginCreateRequest): Promise<PluginDefinition>;
  update(pluginId: string, update: PluginUpdateRequest): Promise<PluginDefinition>;
  delete(pluginId: string): Promise<void>;
}

interface CreatePluginRegistryOpts {
  builtinProvider: ReadonlyPluginProvider;
  persistedProvider: WritablePluginProvider;
}

export const createPluginRegistry = (opts: CreatePluginRegistryOpts): PluginRegistry => {
  return new PluginRegistryImpl(opts);
};

class PluginRegistryImpl implements PluginRegistry {
  private readonly builtinProvider: ReadonlyPluginProvider;
  private readonly persistedProvider: WritablePluginProvider;

  constructor({ builtinProvider, persistedProvider }: CreatePluginRegistryOpts) {
    this.builtinProvider = builtinProvider;
    this.persistedProvider = persistedProvider;
  }

  private get orderedProviders(): PluginProvider[] {
    return [this.builtinProvider, this.persistedProvider];
  }

  async has(pluginId: string): Promise<boolean> {
    for (const provider of this.orderedProviders) {
      if (await provider.has(pluginId)) {
        return true;
      }
    }
    return false;
  }

  async get(pluginId: string): Promise<PluginDefinition> {
    for (const provider of this.orderedProviders) {
      if (await provider.has(pluginId)) {
        return provider.get(pluginId);
      }
    }
    throw createPluginNotFoundError({ pluginId });
  }

  async list(): Promise<PluginDefinition[]> {
    const allPlugins: PluginDefinition[] = [];
    for (const provider of this.orderedProviders) {
      const plugins = await provider.list();
      allPlugins.push(...plugins);
    }
    return allPlugins;
  }

  async create(request: PluginCreateRequest): Promise<PluginDefinition> {
    return this.persistedProvider.create(request);
  }

  async update(pluginId: string, update: PluginUpdateRequest): Promise<PluginDefinition> {
    for (const provider of this.orderedProviders) {
      if (await provider.has(pluginId)) {
        if (isReadonlyProvider(provider)) {
          throw createBadRequestError(`Plugin ${pluginId} is read-only and can't be updated`);
        }
        return provider.update(pluginId, update);
      }
    }
    throw createPluginNotFoundError({ pluginId });
  }

  async delete(pluginId: string): Promise<void> {
    for (const provider of this.orderedProviders) {
      if (await provider.has(pluginId)) {
        if (isReadonlyProvider(provider)) {
          throw createBadRequestError(`Plugin ${pluginId} is read-only and can't be deleted`);
        }
        return provider.delete(pluginId);
      }
    }
    throw createPluginNotFoundError({ pluginId });
  }
}
