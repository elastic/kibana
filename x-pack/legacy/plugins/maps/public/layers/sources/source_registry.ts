/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { AbstractSourceDescriptor } from '../../../common/descriptor_types';
import { ISource } from './source';

type SourceRegistryEntry = {
  ConstructorFunction: new (
    sourceDescriptor: AbstractSourceDescriptor,
    inspectorAdapters: unknown
  ) => ISource;
  type: string;
};

const registry: SourceRegistryEntry[] = [];

export function registerSource(entry: SourceRegistryEntry) {
  registry.push(entry);
}

function getSourceByType(sourceType: string): SourceRegistryEntry | undefined {
  return registry.find((source: SourceRegistryEntry) => source.type === sourceType);
}

export function createSourceInstance(
  sourceDescriptor: AbstractSourceDescriptor,
  inspectorAdapters: object
): ISource {
  const source = getSourceByType(sourceDescriptor.type);
  if (!source) {
    throw new Error(`Unrecognized sourceType ${sourceDescriptor.type}`);
  }
  return new source.ConstructorFunction(sourceDescriptor, inspectorAdapters);
}
