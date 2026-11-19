/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { CustomContentQueryChanges } from '@kbn/custom-content-common';
import { createCustomContentTemplateResolver } from '@kbn/custom-content-server';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { Logger } from '@kbn/logging';
import { generateCustomContentEsql } from '../shared/custom_content_esql';
import { resolveDataQueries, type GenerateDataQueryParams } from './resolve_data_queries';

type GenerateParams = Parameters<typeof generateCustomContentEsql>[0];

/**
 * Gives the values of the ES|QL controls that the queries refer to (`?name`). `anyVariable` is for a
 * query that is not written yet, which can refer to any of them.
 */
export type ResolveCustomContentEsqlVariables = (
  queries: readonly string[],
  options?: { anyVariable?: boolean }
) => Promise<ESQLControlVariable[] | undefined>;

/**
 * `dataQueries` says what to do with the panel's queries by position: each one describes or supplies
 * the query at its position, an empty one keeps it, and a position past the stored queries adds
 * one. Queries it does not reach are kept. Without it the queries stay as they are, and
 * `removeAllQueries` wins over it.
 */
interface BuildCustomContentConfigParams extends CustomContentQueryChanges {
  /** What to show, or what to change on an existing panel. */
  nlQuery?: string;
  /**
   * The panel being edited. Absent for a new panel. Its queries are in the order the template reads
   * them: the first is the main query (`rows`), the others `queries[1]`, `queries[2]`, ...
   */
  existing?: { esqlQueries?: readonly string[]; template?: string };
  timeRange?: GenerateParams['timeRange'];
  resolveEsqlVariables?: ResolveCustomContentEsqlVariables;
  modelProvider: ModelProvider;
  logger: Logger;
  events: ToolEventEmitter;
  esClient: IScopedClusterClient;
}

interface BuildCustomContentConfigResult {
  /**
   * The queries the panel ends up with, in the order the template reads them, none for a panel
   * without data.
   */
  esqlQueries: string[];
  /** The HTML template. On an edit that neither has a prompt nor changes the query, the existing one. */
  template: string;
  /** Height the template needs, in CSS pixels. Absent when the existing template was kept. */
  height?: number;
}

/**
 * Builds the query and the template of a custom content panel, for a new panel or an edit. The
 * dashboard tool, `create_visualization` and `custom_content_update_panel` all build panels here, as
 * the Lens and Vega panels are built by their own builders.
 *
 * The model supplies intent, never markup: the template is written by the server from `nlQuery`,
 * with the real columns of the query, and is only written again when there is a prompt or the query
 * changed, since sampling the data costs a round trip.
 */
export const buildCustomContentConfig = async ({
  nlQuery,
  dataQueries,
  removeAllQueries,
  existing,
  timeRange,
  resolveEsqlVariables,
  modelProvider,
  logger,
  events,
  esClient,
}: BuildCustomContentConfigParams): Promise<BuildCustomContentConfigResult> => {
  const getEsqlVariables = (
    queries: ReadonlyArray<string | null | undefined>,
    options?: { anyVariable?: boolean }
  ) =>
    resolveEsqlVariables?.(
      queries.filter((query): query is string => Boolean(query)),
      options
    );

  const existingQueries = existing?.esqlQueries ?? [];

  const generateQuery = async ({
    description,
    index,
    storedQuery,
    queryCount,
  }: GenerateDataQueryParams) => {
    const storedQueries = storedQuery ? [storedQuery] : [];
    return generateCustomContentEsql({
      nlQuery: description,
      index,
      existingQueries: storedQueries,
      queryCount,
      esqlVariables: await getEsqlVariables(storedQueries, { anyVariable: true }),
      modelProvider,
      events,
      logger,
      esClient,
      ...(timeRange ? { timeRange } : {}),
    });
  };

  // `changedQueries` is per position: whether the query is new or changing, so it is sampled.
  const {
    queries: esqlQueries,
    changed: changedQueries,
    hasChanges,
  } = await resolveDataQueries({
    dataQueries,
    removeAllQueries,
    existingQueries,
    generate: generateQuery,
  });
  if (existing && nlQuery === undefined && !hasChanges) {
    return { esqlQueries, template: existing.template ?? '' };
  }

  const queriesToSample = esqlQueries.filter((_, position) => changedQueries[position]);
  const resolveTemplate = createCustomContentTemplateResolver({ modelProvider, esClient, logger });
  const { template, height } = await resolveTemplate({
    prompt: nlQuery ?? '',
    esqlQueries,
    changedQueries,
    existingTemplate: existing?.template || undefined,
    esqlVariables: queriesToSample.length ? await getEsqlVariables(queriesToSample) : undefined,
  });

  return { esqlQueries, template, height };
};
