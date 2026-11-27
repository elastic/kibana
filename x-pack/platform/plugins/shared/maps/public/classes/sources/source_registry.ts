/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import type { ISource } from './source';

export type SourceRegistryEntry<TSourceDescriptor extends object = object> = {
  ConstructorFunction: new (
    sourceDescriptor: TSourceDescriptor // the source-descriptor that corresponds specifically to the particular ISource instance
  ) => ISource<TSourceDescriptor>;
  type: string;
};

// The registry holds entries for many different descriptor types, so the descriptor type is erased here.
// Type safety is enforced at the registerSource boundary.
const registry: Array<SourceRegistryEntry<any>> = [];

export function registerSource<TSourceDescriptor extends object>(
  entry: SourceRegistryEntry<TSourceDescriptor>
) {
  const sourceTypeExists = registry.some(({ type }) => {
    return entry.type === type;
  });
  if (sourceTypeExists) {
    throw new Error(
      `Unable to register source type ${entry.type}. ${entry.type} has already been registered`
    );
  }
  registry.push(entry);
}

export function getSourceByType(sourceType: string): SourceRegistryEntry<any> | undefined {
  return registry.find((source) => source.type === sourceType);
}
