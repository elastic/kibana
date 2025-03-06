/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AbstractSourceDescriptor } from '../../../common/descriptor_types';
import { ISource } from './source';
import { getSourceByType } from './source_registry';
import { setupSources } from './setup_sources';

setupSources();

export function createSourceInstance(sourceDescriptor: AbstractSourceDescriptor | null): ISource {
  if (sourceDescriptor === null) {
    throw new Error('Source-descriptor should be initialized');
  }
  const source = getSourceByType(sourceDescriptor.type);
  if (!source) {
    throw new Error(`Unrecognized sourceType ${sourceDescriptor.type}`);
  }
  return new source.ConstructorFunction(sourceDescriptor);
}
