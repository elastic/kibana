/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { SearchHit } from '@kbn/es-types';
import type { ESQLAstItem } from '@elastic/esql/types';
import { BasicPrettyPrinter, Builder } from '@elastic/esql';
import { getFlattenedObject } from '@kbn/std';
import type { Streams } from '@kbn/streams-schema';
import {
  getAncestors,
  getEsqlViewName,
  getRoot,
  isDraftStream,
  LOGS_ROOT_STREAM_NAME,
  namespacePrefixes,
  otelFieldAliases,
  withUnmappedFieldsDirective,
} from '@kbn/streams-schema';
import type { StreamsClient } from '../client';
import { collectFieldsWithGeoPoints } from './normalize_geo_points';
import { UNMAPPED_SAMPLE_SIZE } from './unmapped_fields';

/**
 * Walks up the ancestor chain from a draft stream to find the first
 * ancestor with a backing data stream (i.e. not also a draft).
 * Handles nested drafts: draft → draft → materialized parent.
 */
export async function resolveFirstNonDraftAncestor(
  streamsClient: StreamsClient,
  streamName: string
): Promise<string> {
  const ancestorIds = getAncestors(streamName);
  if (ancestorIds.length === 0) {
    return getRoot(streamName);
  }

  const ancestors = await streamsClient.getAncestors(streamName);
  const ancestorsByName = new Map(ancestors.map((a) => [a.name, a]));

  for (let i = ancestorIds.length - 1; i >= 0; i--) {
    const ancestor = ancestorsByName.get(ancestorIds[i]);
    if (ancestor && !isDraftStream(ancestor)) {
      return ancestorIds[i];
    }
  }

  return getRoot(streamName);
}

/**
 * For draft streams, determines unmapped fields by combining two sources:
 *
 * 1. View columns — includes fields created by processing (EVAL, DISSECT,
 *    GROK, etc.) that may not exist in the raw _source. These take priority.
 * 2. METADATA _source — the raw document source, which surfaces truly
 *    unmapped fields that ES|QL's column schema alone may miss.
 *
 * Both sets are unioned and filtered against the stream's defined mappings.
 */
export async function getUnmappedFieldsFromView(
  scopedClusterClient: IScopedClusterClient,
  streamsClient: StreamsClient,
  definition: Streams.WiredStream.Definition
): Promise<string[]> {
  const viewName = getEsqlViewName(definition.name);

  const fromArgs: ESQLAstItem[] = [
    Builder.expression.source.index(viewName),
    Builder.option({
      name: 'METADATA',
      args: [Builder.expression.column({ args: [Builder.identifier({ name: '_source' })] })],
    }),
  ];

  const commands = [
    Builder.command({ name: 'from', args: fromArgs }),
    Builder.command({
      name: 'limit',
      args: [Builder.expression.literal.integer(UNMAPPED_SAMPLE_SIZE)],
    }),
  ];

  const queryBody = BasicPrettyPrinter.multiline(Builder.expression.query(commands), {
    pipeTab: '',
  });

  const [response, ancestors] = await Promise.all([
    scopedClusterClient.asCurrentUser.esql.query({
      query: withUnmappedFieldsDirective(queryBody),
      format: 'json',
    }),
    streamsClient.getAncestors(definition.name),
  ]);

  // View columns: includes processing-derived fields, filtered for aliases
  const viewColumnNames = response.columns
    .map((col) => col.name)
    .filter((name) => name !== '_source');
  const aliasFields = buildAliasFieldSet(viewColumnNames);
  const allFields = new Set(viewColumnNames.filter((col) => !aliasFields.has(col)));

  // _source fields: raw document fields that may not appear as view columns
  const sourceColumnIndex = response.columns.findIndex((col) => col.name === '_source');

  if (sourceColumnIndex >= 0) {
    for (const row of response.values as unknown[][]) {
      const source = row[sourceColumnIndex];
      if (source && typeof source === 'object') {
        for (const field of Object.keys(getFlattenedObject(source as Record<string, unknown>))) {
          allFields.add(field);
        }
      }
    }
  }

  const mappedFields = new Set<string>();
  const geoPointFields = new Set<string>();

  collectFieldsWithGeoPoints(definition.ingest.wired.fields, mappedFields, geoPointFields);

  for (const ancestor of ancestors) {
    collectFieldsWithGeoPoints(ancestor.ingest.wired.fields, mappedFields, geoPointFields);
  }

  return Array.from(allFields)
    .filter((field) => {
      if (mappedFields.has(field)) return false;

      const latMatch = field.match(/^(.+)\.lat$/);
      const lonMatch = field.match(/^(.+)\.lon$/);

      if (latMatch && geoPointFields.has(latMatch[1])) return false;
      if (lonMatch && geoPointFields.has(lonMatch[1])) return false;

      return true;
    })
    .sort();
}

/**
 * Fetches sample documents from a draft stream's ES|QL view.
 *
 * The view encapsulates routing conditions and processing transforms,
 * so the returned documents reflect the post-processing state — the
 * same as fetching from a materialized stream's own index.
 *
 * Returns documents shaped as SearchHit-like objects suitable for
 * `simulate.ingest`, plus the first non-draft ancestor's data stream
 * name (needed for index template lookup in the simulation).
 */
export async function fetchDraftViewSamples(
  scopedClusterClient: IScopedClusterClient,
  streamsClient: StreamsClient,
  streamName: string,
  options: {
    size: number;
    whereExpression?: ESQLAstItem;
  }
): Promise<{ docs: Array<SearchHit<unknown>>; ancestorDataStream: string }> {
  const viewName = getEsqlViewName(streamName);

  const fromArgs: ESQLAstItem[] = [
    Builder.expression.source.index(viewName),
    Builder.option({
      name: 'METADATA',
      args: [Builder.expression.column({ args: [Builder.identifier({ name: '_source' })] })],
    }),
  ];

  const commands: Array<ReturnType<typeof Builder.command>> = [
    Builder.command({ name: 'from', args: fromArgs }),
  ];

  if (options.whereExpression) {
    commands.push(Builder.command({ name: 'where', args: [options.whereExpression] }));
  }

  commands.push(
    Builder.command({
      name: 'limit',
      args: [Builder.expression.literal.integer(options.size)],
    })
  );

  const queryBody = BasicPrettyPrinter.multiline(Builder.expression.query(commands), {
    pipeTab: '',
  });

  const [esqlResponse, ancestorDataStream] = await Promise.all([
    scopedClusterClient.asCurrentUser.esql.query({
      query: withUnmappedFieldsDirective(queryBody),
      format: 'json',
    }),
    resolveFirstNonDraftAncestor(streamsClient, streamName),
  ]);

  const columns = esqlResponse.columns;
  const rootIndex = streamName.startsWith(`${LOGS_ROOT_STREAM_NAME}.`)
    ? getRoot(streamName)
    : streamName;

  const aliasFieldNames = buildAliasFieldSet(columns.map((col) => col.name));
  const sourceColumnIndex = columns.findIndex((col) => col.name === '_source');

  const docs: Array<SearchHit<unknown>> = (esqlResponse.values as unknown[][]).map((row, i) => {
    let source: Record<string, unknown> = {};

    if (sourceColumnIndex >= 0) {
      const rawSource = row[sourceColumnIndex];
      if (rawSource && typeof rawSource === 'object') {
        source = getFlattenedObject(rawSource as Record<string, unknown>);
      }
    }

    columns.forEach((col, j) => {
      if (col.name === '_source') return;
      if (row[j] != null && !aliasFieldNames.has(col.name)) {
        source[col.name] = row[j];
      }
    });

    return {
      _index: rootIndex,
      _id: `esql_sample_${i}`,
      _source: source,
    };
  });

  return { docs, ancestorDataStream };
}

/**
 * OTel passthrough objects and explicit aliases produce duplicate columns
 * in ES|QL results that cannot be written back via `simulate.ingest`.
 *
 * Two categories are stripped:
 * 1. Passthrough aliases — e.g. `secure` when `attributes.secure` exists
 * 2. Explicit OTel aliases — e.g. `message` (alias for `body.text`)
 */
function buildAliasFieldSet(columnNames: string[]): Set<string> {
  const aliases = new Set<string>();

  const namespacedFields = new Set(
    columnNames.filter((name) => namespacePrefixes.some((p) => name.startsWith(p)))
  );

  for (const name of columnNames) {
    if (namespacePrefixes.some((p) => name.startsWith(p))) continue;
    if (namespacePrefixes.some((p) => namespacedFields.has(`${p}${name}`))) {
      aliases.add(name);
    }
  }

  const explicitAliasValues = new Set(Object.values(otelFieldAliases));
  for (const name of columnNames) {
    if (explicitAliasValues.has(name)) {
      aliases.add(name);
    }
  }

  return aliases;
}
