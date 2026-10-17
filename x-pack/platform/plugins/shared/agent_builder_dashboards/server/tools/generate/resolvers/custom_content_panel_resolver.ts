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

/** A custom content panel's config: its content plus the panel's display text. */
type CustomContentPanelConfig = CustomContentState & {
  title?: string;
  description?: string;
};

/** Applies an edit's display text: omitted keeps the existing text, `null` removes it. */
const resolveDisplayTextEdit = (
  edit: string | null | undefined,
  current: string | undefined
): string | undefined => (edit === undefined ? current : edit ?? undefined);

/** Builds the panel's display text, leaving out the parts it does not have. */
const toDisplayText = (
  title: string | undefined,
  description: string | undefined
): Pick<CustomContentPanelConfig, 'title' | 'description'> => ({
  ...(title ? { title } : {}),
  ...(description ? { description } : {}),
});

const resolveCustomContentConfig = async (
  request: CustomContentPanelResolutionRequest,
  resolveTemplate: CustomContentTemplateResolver
): Promise<CustomContentPanelConfig> => {
  const { nlQuery, esql, existingPanel } = request;
  if (!existingPanel) {
    const { template } = await resolveTemplate({ prompt: nlQuery, esqlQuery: esql });
    return {
      esql_query: toEsqlQueryState(esql),
      template,
      ...toDisplayText(request.title, request.description),
    };
  }

  const existing = existingPanel.config as CustomContentPanelConfig;
  const displayText = toDisplayText(
    resolveDisplayTextEdit(request.title, existing.title),
    resolveDisplayTextEdit(request.description, existing.description)
  );

  // A display-text-only edit keeps the content as is.
  if (nlQuery === undefined && esql === undefined) {
    return { esql_query: existing.esql_query, template: existing.template, ...displayText };
  }

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
  return { esql_query: toEsqlQueryState(mergedEsqlQuery), template, ...displayText };
};

/**
 * Resolves custom content panel requests. New panels get a template generated
 * from the request; edits refine the existing panel's template, keeping its
 * ES|QL query unless the request replaces or removes it. The panel title and
 * description come from the request, and edits keep the existing ones unless
 * the request replaces or removes them. On edits, `edit_panels` has already
 * checked that the existing panel is custom content.
 */
export const createCustomContentPanelResolver = ({
  resolveTemplate,
}: {
  resolveTemplate: CustomContentTemplateResolver;
}) => {
  return async (request: CustomContentPanelResolutionRequest): Promise<PanelContentAttempt> => {
    const { operationType, identifier } = request;

    try {
      return {
        type: 'success',
        panelContent: {
          type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
          config: await resolveCustomContentConfig(request, resolveTemplate),
        },
      };
    } catch (error) {
      return createPanelFailureResult(operationType, identifier, getErrorMessage(error));
    }
  };
};
