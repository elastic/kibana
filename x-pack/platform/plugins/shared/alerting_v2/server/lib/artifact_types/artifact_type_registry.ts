/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import { assertBoundedSchema } from './assert_bounded_schema';
import { assertValidDefinition } from './assert_valid_definition';
import type { ArtifactTypeDefinition } from './types';

/**
 * Server-side registry of artifact type definitions. Populated during plugin
 * setup via `registerArtifactType`; read-only afterward for request validation
 * and reference extract/inject.
 */
@injectable()
export class ArtifactTypeRegistry {
  private readonly types = new Map<string, ArtifactTypeDefinition>();

  public register(def: ArtifactTypeDefinition): void {
    assertValidDefinition(def);
    assertBoundedSchema(def.dataSchema, def.type);

    if (this.types.has(def.type)) {
      throw new Error(`Artifact type "${def.type}" is already registered`);
    }

    // Copy and freeze the descriptors too: the caller keeps its own array, so a
    // shared reference would let a plugin mutate e.g. `savedObjectType` after boot.
    this.types.set(
      def.type,
      Object.freeze({
        ...def,
        references: def.references?.map((descriptor) => Object.freeze({ ...descriptor })),
      })
    );
  }

  public get(type: string): ArtifactTypeDefinition | undefined {
    return this.types.get(type);
  }

  public getAll(): ArtifactTypeDefinition[] {
    return [...this.types.values()];
  }
}

/** Injectable token alias — the class itself is the service identifier. */
export type ArtifactTypeRegistryContract = ArtifactTypeRegistry;
