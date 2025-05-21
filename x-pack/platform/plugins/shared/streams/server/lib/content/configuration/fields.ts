/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import {
  ContentPackFields,
  ContentPackIncludedObjects,
  isIncludeAll,
} from '@kbn/content-packs-schema';
import {
  FieldDefinition,
  FieldDefinitionConfig,
  Streams,
  getInheritedFieldsFromAncestors,
} from '@kbn/streams-schema';
import { StreamsClient } from '../../streams/client';

export async function getFieldsEntry({
  stream,
  streamsClient,
  includedObjects,
}: {
  stream: Streams.all.Definition;
  streamsClient: StreamsClient;
  includedObjects: ContentPackIncludedObjects;
}): Promise<ContentPackFields | undefined> {
  if (
    !Streams.WiredStream.Definition.is(stream) ||
    (!isIncludeAll(includedObjects) && !isIncludeAll(includedObjects.objects.fields))
  ) {
    return undefined;
  }

  const inheritedFields = getInheritedFieldsFromAncestors(
    await streamsClient.getAncestors(stream.name)
  );

  const fields = Object.entries({ ...inheritedFields, ...stream.ingest.wired.fields })
    .filter(([, value]) => value.type !== 'system')
    .reduce((acc, [key, value]) => {
      acc[key] = omit(value, ['from']) as FieldDefinitionConfig;
      return acc;
    }, {} as FieldDefinition);

  return {
    id: 'fields',
    type: 'fields',
    content: fields,
  };
}

export function getNewFields(mappedFields: FieldDefinition, fieldEntry: ContentPackFields) {
  return Object.keys(fieldEntry.content)
    .filter((key) => !mappedFields[key])
    .reduce((acc, field) => {
      if (!mappedFields[field]) {
        acc[field] = fieldEntry.content[field];
      }
      return acc;
    }, {} as FieldDefinition);
}
