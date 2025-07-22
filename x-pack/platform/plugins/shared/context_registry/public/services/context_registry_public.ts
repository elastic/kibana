/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

export interface ContextDefinitionPublicProps<TPayload = {}, TMetadata = {}> {
  data: {
    attachments: Array<{
      attachment: Array<Record<string, unknown>>;
      payload: TPayload;
    }>;
    metadata?: TMetadata;
  };
}

export interface ContextDefinitionPublic<TPayload = {}, TMetadata = {}> {
  key: string;
  displayName: string;
  description: string;
  children: React.LazyExoticComponent<React.FC<ContextDefinitionPublicProps<TPayload, TMetadata>>>;
}

export class ContextRegistryPublic {
  private registry: Map<string, ContextDefinitionPublic> = new Map();

  public register(contextDefinition: ContextDefinitionPublic): void {
    if (this.registry.has(contextDefinition.key)) {
      throw new Error(
        `Context with key '${contextDefinition.key}' is already registered with public context registry.`
      );
    }
    this.registry.set(contextDefinition.key, contextDefinition);
  }

  get(key: string): ContextDefinitionPublic | undefined {
    return this.registry.get(key);
  }

  getAll(): ContextDefinitionPublic[] {
    return Array.from(this.registry.values());
  }
}
