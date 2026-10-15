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
  getGridRowsForPixelHeight,
  type CustomContentPanelResolutionRequest,
  type PanelContentAttempt,
} from '@kbn/dashboard-agent-authoring';

const resolveCustomContentState = async (
  request: CustomContentPanelResolutionRequest,
  resolveTemplate: CustomContentTemplateResolver
): Promise<{ config: CustomContentState; height: number }> => {
  const { nlQuery, esql, existingPanel } = request;
  if (!existingPanel) {
    const { template, height } = await resolveTemplate({ prompt: nlQuery, esqlQuery: esql });
    return { config: { esql_query: toEsqlQueryState(esql), template }, height };
  }

  const existing = existingPanel.config as CustomContentState;
  const { query: mergedEsqlQuery, isChanging: isQueryChanging } = resolveEsqlQueryEdit(
    esql,
    readEsqlQuery(existing)
  );
  const { template, height } = await resolveTemplate({
    prompt: nlQuery ?? '',
    esqlQuery: isQueryChanging ? mergedEsqlQuery : undefined,
    existingTemplate: existing.template,
    hasExistingQuery: !isQueryChanging && !!mergedEsqlQuery,
  });
  return { config: { esql_query: toEsqlQueryState(mergedEsqlQuery), template }, height };
};

/**
 * Resolves custom content panel requests. New panels get a template generated
 * from the request; edits refine the existing panel's template, keeping its
 * ES|QL query unless the request replaces or removes it. On edits, `edit_panels`
 * has already checked that the existing panel is custom content.
 */
export const createCustomContentPanelResolver = ({
  resolveTemplate,
}: {
  resolveTemplate: CustomContentTemplateResolver;
}) => {
  return async (request: CustomContentPanelResolutionRequest): Promise<PanelContentAttempt> => {
    const { operationType, identifier } = request;

    try {
      const { config, height } = await resolveCustomContentState(request, resolveTemplate);
      return {
        type: 'success',
        panelContent: { type: CUSTOM_CONTENT_EMBEDDABLE_TYPE, config },
        preferredHeight: getGridRowsForPixelHeight(height),
      };
    } catch (error) {
      return createPanelFailureResult(operationType, identifier, getErrorMessage(error));
    }
  };
};
