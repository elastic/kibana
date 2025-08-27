/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PropertyChange, StreamChanges } from '@kbn/content-packs-schema';
import { FieldDefinition, RoutingDefinition, StreamQuery } from '@kbn/streams-schema';
import { StreamTree } from './tree';
import { isEqual, uniqBy } from 'lodash';

export function diffTrees({ existing, merged }: { existing: StreamTree; merged: StreamTree }) {
  return _diffTrees({ existing, merged });
}

function _diffTrees({
  existing,
  merged,
}: {
  existing?: StreamTree;
  merged?: StreamTree;
}): StreamChanges[] {
  if (!existing && !merged) {
    throw new Error('input or output should be specified');
  }

  if (existing && merged) {
    const queries = diffQueries({
      existing: existing.request.queries,
      merged: merged.request.queries,
    });
    const fields = diffFields({
      input: existing.request.stream.ingest.wired.fields,
      output: merged.request.stream.ingest.wired.fields,
    });
    const routing = diffRouting({
      input: existing.request.stream.ingest.wired.routing,
      output: merged.request.stream.ingest.wired.routing,
    });

    return [
      mergePropertyDiffs(existing.name, { queries, fields, routing }),
      ...uniqBy([...merged.children, ...existing.children], ({ name }) => name).flatMap((child) => {
        const inputChild = existing.children.find(({ name }) => name === child.name);
        const outputChild = merged.children.find(({ name }) => name === child.name);
        return _diffTrees({ existing: inputChild, merged: outputChild });
      }),
    ];
  }

  if (existing && !merged) {
    return [
      mergePropertyDiffs(existing.name),
      ...existing.children.flatMap((child) => _diffTrees({ existing: child })),
    ];
  }

  return [
    mergePropertyDiffs(merged!.name),
    ...merged!.children.flatMap((child) => _diffTrees({ merged: child })),
  ];
}

function diffQueries({
  existing,
  merged,
}: {
  existing: StreamQuery[];
  merged: StreamQuery[];
}): PropertyChange[] {
  const changes: PropertyChange[] = [];

  uniqBy([...existing, ...merged], ({ id }) => id).forEach((query) => {
    const existingQuery = existing.find(({ id }) => id == query.id);
    const mergedQuery = merged.find(({ id }) => id == query.id);

    if (existingQuery && mergedQuery) {
      if (!isEqual(existingQuery, mergedQuery)) {
        changes.push({
          operation: 'update',
          type: 'query',
          value: { from: existingQuery, to: mergedQuery },
        });
      }
    } else if (existingQuery) {
      changes.push({ operation: 'remove', type: 'query', value: existingQuery });
    } else if (mergedQuery) {
      changes.push({ operation: 'add', type: 'query', value: mergedQuery });
    }
  });

  return changes;
}

function diffFields({
  input,
  output,
}: {
  input: FieldDefinition;
  output: FieldDefinition;
}): PropertyChange[] {
  const changes: PropertyChange[] = [];

  Object.keys({ ...input, ...output }).forEach((key) => {
    const inputField = input[key];
    const outputField = output[key];

    if (inputField && outputField) {
      if (!isEqual(inputField, outputField)) {
        changes.push({
          operation: 'update',
          type: 'field',
          value: { from: { [key]: inputField }, to: { [key]: outputField } },
        });
      }
    } else if (inputField) {
      changes.push({ operation: 'remove', type: 'field', value: { [key]: inputField } });
    } else if (outputField) {
      changes.push({ operation: 'add', type: 'field', value: { [key]: outputField } });
    }
  });

  return changes;
}

function diffRouting({
  input,
  output,
}: {
  input: RoutingDefinition[];
  output: RoutingDefinition[];
}): PropertyChange[] {
  const changes: PropertyChange[] = [];

  uniqBy([...output, ...input], ({ destination }) => destination).forEach((definition) => {
    const inputDefinition = input.find(({ destination }) => destination == definition.destination);
    const outputDefinition = output.find(
      ({ destination }) => destination == definition.destination
    );

    if (inputDefinition && outputDefinition) {
      if (!isEqual(inputDefinition, outputDefinition)) {
        changes.push({
          operation: 'update',
          type: 'routing',
          value: { from: inputDefinition, to: outputDefinition },
        });
      }
    } else if (inputDefinition) {
      changes.push({ operation: 'remove', type: 'routing', value: inputDefinition });
    } else if (outputDefinition) {
      changes.push({ operation: 'add', type: 'routing', value: outputDefinition });
    }
  });

  return changes;
}

function mergePropertyDiffs(
  name: string,
  {
    queries,
    fields,
    routing,
  }: {
    queries: PropertyChange[];
    fields: PropertyChange[];
    routing: PropertyChange[];
  } = { queries: [], fields: [], routing: [] }
): StreamChanges {
  return { name, changes: [...queries, ...fields, ...routing] };
}
