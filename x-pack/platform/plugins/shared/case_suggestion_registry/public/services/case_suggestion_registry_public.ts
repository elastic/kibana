/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { CaseSuggestionResponse, SuggestionOwner } from '../../common/types';
import { OWNERS } from '../../common/constants';

interface BaseCaseSuggestionDefinitionPublic {
  key: string;
  owner: SuggestionOwner;
}

export type CaseSuggestionDefinitionPublic<TPayload = {}> = BaseCaseSuggestionDefinitionPublic & {
  children: React.LazyExoticComponent<React.FC<CaseSuggestionChildrenProps<TPayload>>>;
};

export interface CaseSuggestionChildrenProps<TPayload = {}> {
  caseSuggestion: CaseSuggestionResponse<TPayload>;
}

export class CaseSuggestionRegistryPublic {
  private registry: Record<SuggestionOwner, Map<string, BaseCaseSuggestionDefinitionPublic>> =
    OWNERS.reduce((acc, owner) => {
      acc[owner] = new Map();
      return acc;
    }, {} as Record<SuggestionOwner, Map<string, BaseCaseSuggestionDefinitionPublic>>);

  public registerHandler<TPayload = {}>(
    caseSuggestionDefinition: CaseSuggestionDefinitionPublic<TPayload>
  ): void {
    if (!this.registry[caseSuggestionDefinition.owner]) {
      throw new Error(`Owner '${caseSuggestionDefinition.owner}' is not recognized.`);
    }

    if (this.registry[caseSuggestionDefinition.owner].has(caseSuggestionDefinition.key)) {
      throw new Error(
        `CaseSuggestion with key '${caseSuggestionDefinition.key}' is already registered for owner '${caseSuggestionDefinition.owner}'.`
      );
    }

    this.registry[caseSuggestionDefinition.owner].set(
      caseSuggestionDefinition.key,
      caseSuggestionDefinition
    );
  }

  getCaseSuggestionByKey<TPayload = {}>({
    owner,
    key,
  }: {
    owner: SuggestionOwner;
    key: string;
  }): CaseSuggestionDefinitionPublic<TPayload> {
    if (!this.registry[owner]) {
      throw new Error(`Owner '${owner}' is not recognized.`);
    }

    if (!this.registry[owner].has(key)) {
      throw new Error(`CaseSuggestion with key '${key}' is not registered for owner '${owner}'.`);
    }

    return this.registry[owner].get(key) as CaseSuggestionDefinitionPublic<TPayload>;
  }

  getCaseSuggestionByOwner(owner: SuggestionOwner): CaseSuggestionDefinitionPublic[] {
    if (!this.registry[owner]) {
      throw new Error(`Owner '${owner}' is not recognized.`);
    }

    return Array.from(this.registry[owner].values()) as CaseSuggestionDefinitionPublic[];
  }
}
