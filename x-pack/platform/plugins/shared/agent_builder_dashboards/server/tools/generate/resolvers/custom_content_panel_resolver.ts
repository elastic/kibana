/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  readEsqlQuery,
  resolveEsqlQueryEdit,
  toEsqlQueryState,
  type CustomContentState,
} from '@kbn/custom-content-common';
import type { CustomContentTemplateResolver } from '@kbn/custom-content-server';
import {
  createPanelFailureResult,
  getErrorMessage,
  type CustomContentPanelResolutionRequest,
  type PanelContentAttempt,
} from '@kbn/dashboard-agent-authoring';

const resolveCustomContentState = async (
  request: CustomContentPanelResolutionRequest,
  resolveTemplate: CustomContentTemplateResolver
): Promise<CustomContentState> => {
  const { nlQuery, esql, existingPanel } = request;
  if (!existingPanel) {
    const { template } = await resolveTemplate({ prompt: nlQuery, esqlQuery: esql });
    return { esql_query: toEsqlQueryState(esql), template };
  }

  const existing = existingPanel.config as CustomContentState;
  const { query: mergedEsqlQuery, isChanging: isQueryChanging } = resolveEsqlQueryEdit(
    esql,
    readEsqlQuery(existing)
  );
  const { template } = await resolveTemplate({
    prompt: nlQuery ?? '',
    esqlQuery: isQueryChanging ? mergedEsqlQuery : undefined,
    existingTemplate: existing.template,
    hasExistingQuery: !isQueryChanging && !!mergedEsqlQuery,
  });
  return { esql_query: toEsqlQueryState(mergedEsqlQuery), template };
};

/**
 * Resolves custom content panel requests. New panels get a template generated
 * from the request; edits refine the existing panel's template, keeping its
 * ES|QL query unless the request replaces or removes it. On edits, upsert
 * has already checked that the existing panel is custom content.
 */
export const createCustomContentPanelResolver = ({
  resolveTemplate,
}: {
  resolveTemplate: CustomContentTemplateResolver;
}) => {
  return async (request: CustomContentPanelResolutionRequest): Promise<PanelContentAttempt> => {
    const { identifier } = request;

    try {
      return {
        type: 'success',
        panelContent: {
          type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
          config: await resolveCustomContentState(request, resolveTemplate),
        },
      };
    } catch (error) {
      return createPanelFailureResult(identifier, getErrorMessage(error));
    }
  };
};
