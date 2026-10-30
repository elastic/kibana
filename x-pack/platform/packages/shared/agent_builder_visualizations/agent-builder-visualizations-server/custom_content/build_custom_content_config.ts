/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { createCustomContentTemplateResolver } from '@kbn/custom-content-server';
import type { Logger } from '@kbn/logging';
import { generateCustomContentEsql } from '../shared/custom_content_esql';

type GenerateParams = Parameters<typeof generateCustomContentEsql>[0];

interface BuildCustomContentConfigParams {
  /** What to show, or what to change on an existing panel. */
  nlQuery?: string;
  /** Index, alias or data stream the query is generated from. */
  index?: string;
  /** A query the user supplied verbatim. It wins over `hasData`; `null` removes the stored query. */
  esql?: string | null;
  /**
   * `false`: the panel has no data, so no query. `true`: the panel has a query, generated when it
   * has none. Omitted on an edit: keep the current data state.
   */
  hasData?: boolean;
  /** Regenerate the query from `nlQuery`, starting from the stored one so unrelated parts survive. */
  regenerateESQL?: boolean;
  /** The panel being edited. Absent for a new panel. */
  existing?: { esqlQuery?: string; template?: string };
  timeRange?: GenerateParams['timeRange'];
  modelProvider: ModelProvider;
  logger: Logger;
  events: ToolEventEmitter;
  esClient: IScopedClusterClient;
}

interface BuildCustomContentConfigResult {
  /** The query the panel ends up with, absent for a panel without data. */
  esqlQuery?: string;
  /** The HTML template. On an edit that neither has a prompt nor changes the query, the existing one. */
  template: string;
  /** Height the template needs, in CSS pixels. Absent when the existing template was kept. */
  height?: number;
}

/**
 * Decides which ES|QL query a custom content panel ends up with. A supplied query always wins. A
 * new panel gets a generated query unless it is declared data-free. An edit keeps the stored query
 * unless it is replaced, removed or explicitly regenerated, so a style-only edit never pays for
 * generation.
 */
const resolveQuery = async ({
  esql,
  hasData,
  regenerate,
  existingQuery,
  isNewPanel,
  generate,
}: {
  esql?: string | null;
  hasData?: boolean;
  regenerate?: boolean;
  existingQuery?: string;
  isNewPanel: boolean;
  generate: (existingQueries: string[]) => Promise<string>;
}): Promise<string | undefined> => {
  if (esql?.trim()) return esql;
  if (esql === null || hasData === false) return undefined;
  if (isNewPanel) return generate([]);
  if (regenerate) return generate(existingQuery ? [existingQuery] : []);
  if (existingQuery) return existingQuery;
  return hasData === true ? generate([]) : undefined;
};

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
  index,
  esql,
  hasData,
  regenerateESQL,
  existing,
  timeRange,
  modelProvider,
  logger,
  events,
  esClient,
}: BuildCustomContentConfigParams): Promise<BuildCustomContentConfigResult> => {
  const esqlQuery = await resolveQuery({
    esql,
    hasData,
    regenerate: regenerateESQL,
    existingQuery: existing?.esqlQuery,
    isNewPanel: !existing,
    generate: (existingQueries) =>
      generateCustomContentEsql({
        nlQuery: nlQuery ?? '',
        index,
        existingQueries,
        modelProvider,
        events,
        logger,
        esClient,
        ...(timeRange ? { timeRange } : {}),
      }),
  });

  const isQueryChanging = esqlQuery !== existing?.esqlQuery;
  if (existing && nlQuery === undefined && !isQueryChanging) {
    return { esqlQuery, template: existing.template ?? '' };
  }

  const resolveTemplate = createCustomContentTemplateResolver({ modelProvider, esClient, logger });
  const { template, height } = await resolveTemplate({
    prompt: nlQuery ?? '',
    esqlQuery: isQueryChanging ? esqlQuery : undefined,
    existingTemplate: existing?.template || undefined,
    hasExistingQuery: !isQueryChanging && Boolean(esqlQuery),
  });

  return { esqlQuery, template, height };
};
