/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { BuilderTypeDefinition } from './types';

@injectable()
export class BuilderTypeRegistry {
  private readonly types = new Map<string, BuilderTypeDefinition>();

  public register(definition: BuilderTypeDefinition): void {
    const type = definition.type.trim();
    if (!type) {
      throw new Error('Builder type must be a non-empty string');
    }
    if (this.types.has(type)) {
      throw new Error(`Builder type "${type}" is already registered`);
    }
    this.types.set(type, { ...definition, type });
  }

  public get(type: string): BuilderTypeDefinition | undefined {
    return this.types.get(type.trim());
  }
}
