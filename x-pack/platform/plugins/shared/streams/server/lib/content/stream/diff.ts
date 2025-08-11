/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PropertyDiff, StreamDiff } from '@kbn/content-packs-schema';
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
}): StreamDiff[] {
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
}): PropertyDiff<'query'> {
  const diff: PropertyDiff<'query'> = { added: [], removed: [], updated: [] };

  uniqBy([...existing, ...merged], ({ id }) => id).forEach((query) => {
    const existingQuery = existing.find(({ id }) => id == query.id);
    const mergedQuery = merged.find(({ id }) => id == query.id);

    if (existingQuery && mergedQuery) {
      if (!isEqual(existingQuery, mergedQuery)) {
        diff.updated.push({ type: 'query', value: { from: existingQuery, to: mergedQuery } });
      }
    } else if (existingQuery) {
      diff.removed.push({ type: 'query', value: { from: existingQuery } });
    } else if (mergedQuery) {
      diff.added.push({ type: 'query', value: { to: mergedQuery } });
    }
  });

  return diff;
}

function diffFields({
  input,
  output,
}: {
  input: FieldDefinition;
  output: FieldDefinition;
}): PropertyDiff<'field'> {
  const diff: PropertyDiff<'field'> = { added: [], removed: [], updated: [] };

  Object.keys({ ...input, ...output }).forEach((key) => {
    const inputField = input[key];
    const outputField = output[key];

    if (inputField && outputField) {
      if (!isEqual(inputField, outputField)) {
        diff.updated.push({
          type: 'field',
          value: { from: { [key]: inputField }, to: { [key]: outputField } },
        });
      }
    } else if (inputField) {
      diff.removed.push({ type: 'field', value: { from: { [key]: inputField } } });
    } else if (outputField) {
      diff.added.push({ type: 'field', value: { to: { [key]: outputField } } });
    }
  });

  return diff;
}

function diffRouting({
  input,
  output,
}: {
  input: RoutingDefinition[];
  output: RoutingDefinition[];
}): PropertyDiff<'routing'> {
  const diff: PropertyDiff<'routing'> = { added: [], removed: [], updated: [] };

  uniqBy([...output, ...input], ({ destination }) => destination).forEach((definition) => {
    const inputDefinition = input.find(({ destination }) => destination == definition.destination);
    const outputDefinition = output.find(
      ({ destination }) => destination == definition.destination
    );

    if (inputDefinition && outputDefinition) {
      if (!isEqual(inputDefinition, outputDefinition)) {
        diff.updated.push({
          type: 'routing',
          value: { from: inputDefinition, to: outputDefinition },
        });
      }
    } else if (inputDefinition) {
      diff.removed.push({ type: 'routing', value: { from: inputDefinition } });
    } else if (outputDefinition) {
      diff.added.push({ type: 'routing', value: { to: outputDefinition } });
    }
  });

  return diff;
}

function mergePropertyDiffs(
  name: string,
  {
    queries,
    fields,
    routing,
  }: {
    queries: PropertyDiff<'query'>;
    fields: PropertyDiff<'field'>;
    routing: PropertyDiff<'routing'>;
  } = {
    queries: { added: [], updated: [], removed: [] },
    fields: { added: [], updated: [], removed: [] },
    routing: { added: [], updated: [], removed: [] },
  }
): StreamDiff {
  return {
    name,
    diff: {
      added: [...queries.added, ...fields.added, ...routing.added],
      removed: [...queries.removed, ...fields.removed, ...routing.removed],
      updated: [...queries.updated, ...fields.updated, ...routing.updated],
    },
  };
}
