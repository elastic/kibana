/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { AbstractSourceDescriptor, ISource } from './source';

type SourceRegistryEntry = {
  description: string;
  factory: (sourceDescriptor: AbstractSourceDescriptor, inspectorAdapters: object) => ISource;
  icon: string;
  id: string;
  isIndexingSource?: boolean;
  order: number; // number to control display order in UI. Lower numbers display first
  renderCreateEditor({
    onPreviewSource,
    inspectorAdapters,
  }: {
    onPreviewSource: () => void;
    inspectorAdapters: unknown;
  }): unknown;
  title: string;
  type: string;
};

const registry: SourceRegistryEntry[] = [];

export function registerSource(entry: SourceRegistryEntry) {
  registry.push(entry);
}

export function getSources(): SourceRegistryEntry[] {
  return registry.sort(function(a: SourceRegistryEntry, b: SourceRegistryEntry) {
    return a.order - b.order;
  });
}

export function getSourceById(sourceId: string): SourceRegistryEntry | undefined {
  return registry.find((source: SourceRegistryEntry) => source.id === sourceId);
}

export function getSourceByType(type: string): SourceRegistryEntry | undefined {
  return registry.find((source: SourceRegistryEntry) => source.type === type);
}
