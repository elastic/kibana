/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ContextResponse, ContextOwner } from '../../common/types';
import { OWNERS } from '../../common/constants';

interface BaseContextDefinitionPublic {
  key: string;
  owner: ContextOwner;
}

export type ContextDefinitionPublic<TPayload = {}> = BaseContextDefinitionPublic & {
  children: React.LazyExoticComponent<React.FC<ContextChildrenProps<TPayload>>>;
};

export interface ContextChildrenProps<TPayload = {}> {
  context: ContextResponse<TPayload>;
}

export class ContextRegistryPublic {
  private registry: Record<ContextOwner, Map<string, BaseContextDefinitionPublic>> = OWNERS.reduce(
    (acc, owner) => {
      acc[owner] = new Map();
      return acc;
    },
    {} as Record<ContextOwner, Map<string, BaseContextDefinitionPublic>>
  );

  public registerHandler<TPayload = {}>(
    contextDefinition: ContextDefinitionPublic<TPayload>
  ): void {
    if (!this.registry[contextDefinition.owner]) {
      throw new Error(`Owner '${contextDefinition.owner}' is not recognized.`);
    }

    if (this.registry[contextDefinition.owner].has(contextDefinition.key)) {
      throw new Error(
        `Context with key '${contextDefinition.key}' is already registered for owner '${contextDefinition.owner}'.`
      );
    }

    this.registry[contextDefinition.owner].set(contextDefinition.key, contextDefinition);
  }

  getContextByKey<TPayload = {}>({
    owner,
    key,
  }: {
    owner: ContextOwner;
    key: string;
  }): ContextDefinitionPublic<TPayload> {
    if (!this.registry[owner]) {
      throw new Error(`Owner '${owner}' is not recognized.`);
    }

    if (!this.registry[owner].has(key)) {
      throw new Error(`Context with key '${key}' is not registered for owner '${owner}'.`);
    }

    return this.registry[owner].get(key) as ContextDefinitionPublic<TPayload>;
  }

  getContextByOwner(owner: ContextOwner): ContextDefinitionPublic[] {
    if (!this.registry[owner]) {
      throw new Error(`Owner '${owner}' is not recognized.`);
    }

    return Array.from(this.registry[owner].values()) as ContextDefinitionPublic[];
  }
}
