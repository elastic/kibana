/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

export interface SuggestionDefinitionPublicProps<TPayload = {}, TMetadata = {}> {
  data: {
    attachments: Array<{
      attachment: Array<Record<string, unknown>>;
      payload: TPayload;
    }>;
    metadata?: TMetadata;
  };
}

export interface SuggestionDefinitionPublic<TPayload = {}, TMetadata = {}> {
  suggestionId: string;
  displayName: string;
  description: string;
  children?: React.LazyExoticComponent<
    React.FC<SuggestionDefinitionPublicProps<TPayload, TMetadata>>
  >;
}

export class Registry {
  private registry: Map<string, SuggestionDefinitionPublic> = new Map();

  public register(suggestion: SuggestionDefinitionPublic): void {
    if (this.registry.has(suggestion.suggestionId)) {
      throw new Error(
        `Suggestion with suggestionId '${suggestion.suggestionId}' is already registered.`
      );
    }
    this.registry.set(suggestion.suggestionId, suggestion);
  }

  get(suggestionId: string): SuggestionDefinitionPublic | undefined {
    return this.registry.get(suggestionId);
  }

  getAll(): SuggestionDefinitionPublic[] {
    return Array.from(this.registry.values());
  }
}
