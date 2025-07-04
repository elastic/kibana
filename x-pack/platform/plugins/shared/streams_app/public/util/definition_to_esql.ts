/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams, definitionToESQLQuery as baseDefinitionToESQLQuery } from '@kbn/streams-schema';
import { getIndexPatterns } from './hierarchy_helpers';

export function definitionToESQLQuery(
  definition: Streams.ingest.all.GetResponse,
  parent?: Streams.WiredStream.GetResponse,
  { includeSource }: { includeSource?: boolean } = {}
): string | undefined {
  if (!Streams.WiredStream.GetResponse.is(definition) || !definition.stream.ingest.wired.draft) {
    const indexPatterns = getIndexPatterns(definition.stream);
    return indexPatterns ? `FROM ${indexPatterns.join(', ')}` : undefined;
  }

  return baseDefinitionToESQLQuery(definition, parent, { includeSource });
}
