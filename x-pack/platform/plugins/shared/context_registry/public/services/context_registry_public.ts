/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ContextResponse } from '../../common/types';
interface BaseContextDefinitionPublic {
  key: string;
}

export type ContextDefinitionPublic<TPayload = {}> = BaseContextDefinitionPublic & {
  children: React.LazyExoticComponent<React.FC<ContextChildrenProps<TPayload>>>;
};

export interface ContextChildrenProps<TPayload = {}> {
  context: ContextResponse<TPayload>;
}

export class ContextRegistryPublic {
  private registry: Map<string, BaseContextDefinitionPublic> = new Map();

  public registerHandler<TPayload = {}>(
    contextDefinition: ContextDefinitionPublic<TPayload>
  ): void {
    if (this.registry.has(contextDefinition.key)) {
      throw new Error(
        `Context with key '${contextDefinition.key}' is already registered with public context registry.`
      );
    }
    this.registry.set(contextDefinition.key, contextDefinition);
  }

  getContextByKey<TPayload = {}>(key: string): ContextDefinitionPublic<TPayload> {
    if (!this.registry.has(key)) {
      throw new Error(`Context with key '${key}' is not registered.`);
    }
    return this.registry.get(key) as ContextDefinitionPublic<TPayload>;
  }

  getAll(): ContextDefinitionPublic[] {
    return Array.from(this.registry.values()) as ContextDefinitionPublic[];
  }
}
