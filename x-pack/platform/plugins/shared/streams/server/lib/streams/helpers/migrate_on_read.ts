/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import { BaseStream } from '@kbn/streams-schema/src/models/base';

export function migrateOnRead(definition: Record<string, unknown>): Streams.all.Definition {
  let migratedDefinition = definition;
  if (typeof definition.description !== 'string') {
    migratedDefinition = {
      ...definition,
      description: '',
    };
  }
  Streams.all.Definition.asserts(migratedDefinition as unknown as BaseStream.Definition);

  return migratedDefinition as unknown as Streams.all.Definition;
}
