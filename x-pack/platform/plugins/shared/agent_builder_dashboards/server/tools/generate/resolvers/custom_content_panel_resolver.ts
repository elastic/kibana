/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  readEsqlQuery,
  readAdditionalEsqlQueries,
  resolveCustomContentQuery,
  resolveCustomContentQueries,
  toEsqlQueryState,
  type CustomContentState,
} from '@kbn/custom-content-common';
import type { CustomContentTemplateResolver } from '@kbn/custom-content-server';
import {
  getErrorMessage,
  type CustomContentPanelResolutionRequest,
  type PanelContentAttempt,
} from '@kbn/dashboard-agent-authoring';

/** Generates a custom content panel's ES|QL query; `existingQueries` holds the one to modify. */
export type CustomContentEsqlGenerator = (params: {
  nlQuery: string;
  index?: string;
  existingQueries: string[];
  /** True when the query is one of several that feed the panel, not its only one. */
  isDataset?: boolean;
}) => Promise<string>;

const resolveCustomContentState = async (
  request: CustomContentPanelResolutionRequest,
  resolveTemplate: CustomContentTemplateResolver,
  generateEsql: CustomContentEsqlGenerator
): Promise<CustomContentState> => {
  const { nlQuery, esql, hasData, index, existingPanel, datasets } = request;
  const generate = (existingQueries: string[]) =>
    generateEsql({ nlQuery: nlQuery ?? '', index, existingQueries });

  if (datasets) {
    // The panel's queries are listed by position: the first is `rows`, the n-th `queries[n].rows`.
    const existing = existingPanel?.config as CustomContentState | undefined;
    const { queries, changed } = await resolveCustomContentQueries({
      datasets,
      existingQueries: existing?.esql_query ?? [],
      generate: ({ description, index: datasetIndex }, existingQueries) =>
        generateEsql({
          nlQuery: description,
          index: datasetIndex,
          existingQueries,
          isDataset: true,
        }),
    });
    const [mainQuery, ...additionalEsqlQueries] = queries;
    const { template } = await resolveTemplate({
      prompt: nlQuery ?? '',
      esqlQuery: changed[0] ? mainQuery : undefined,
      existingTemplate: existing?.template,
      hasExistingQuery: !changed[0] && !!mainQuery,
      additionalEsqlQueries,
    });
    return { esql_query: queries, template };
  }

  if (!existingPanel) {
    // The agent always states hasData: a static panel (false) has no query unless one is supplied.
    const { query } = await resolveCustomContentQuery({
      suppliedQuery: esql,
      hasData,
      existingQuery: undefined,
      isNewPanel: true,
      generate,
    });
    const { template } = await resolveTemplate({ prompt: nlQuery, esqlQuery: query });
    return { esql_query: toEsqlQueryState(query), template };
  }

  const existing = existingPanel.config as CustomContentState;
  const { query: mergedEsqlQuery, isChanging: isQueryChanging } = await resolveCustomContentQuery({
    suppliedQuery: esql,
    hasData,
    regenerate: request.regenerateESQL,
    existingQuery: readEsqlQuery(existing),
    isNewPanel: false,
    generate,
  });
  // The panel's other queries are kept as they are, but only while it still has a main query.
  const additionalEsqlQueries = mergedEsqlQuery ? readAdditionalEsqlQueries(existing) : [];
  const { template } = await resolveTemplate({
    prompt: nlQuery ?? '',
    esqlQuery: isQueryChanging ? mergedEsqlQuery : undefined,
    existingTemplate: existing.template,
    hasExistingQuery: !isQueryChanging && !!mergedEsqlQuery,
    additionalEsqlQueries,
  });
  return {
    esql_query: toEsqlQueryState(mergedEsqlQuery, additionalEsqlQueries),
    template,
  };
};

/**
 * Resolves custom content panel requests. New panels get a template generated
 * from the request; edits refine the existing panel's template, keeping its
 * ES|QL query unless the request replaces, removes or regenerates it. Static panels have no query. On edits, upsert
 * has already checked that the existing panel is custom content.
 */
export const createCustomContentPanelResolver = ({
  resolveTemplate,
  generateEsql,
}: {
  resolveTemplate: CustomContentTemplateResolver;
  generateEsql: CustomContentEsqlGenerator;
}) => {
  return async (request: CustomContentPanelResolutionRequest): Promise<PanelContentAttempt> => {
    try {
      return {
        type: 'success',
        panelContent: {
          type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
          config: await resolveCustomContentState(request, resolveTemplate, generateEsql),
        },
      };
    } catch (error) {
      return { type: 'failure', error: getErrorMessage(error) };
    }
  };
};
