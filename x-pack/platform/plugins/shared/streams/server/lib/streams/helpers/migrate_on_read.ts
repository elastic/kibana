/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';

export function migrateOnRead(definition: Streams.all.Definition): Streams.all.Definition {
  if (typeof definition.description !== 'string') {
    return {
      ...definition,
      description: '',
    };
  }
  return definition;
}
