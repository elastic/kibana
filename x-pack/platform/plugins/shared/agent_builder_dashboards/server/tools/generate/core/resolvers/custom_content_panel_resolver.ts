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
import type { ResolvedCustomContentTemplate } from '@kbn/custom-content-server';
import { createPanelFailureResult, type PanelContentAttempt } from '../resolve_panel';
import { getErrorMessage } from '../utils';
import type { CustomContentPanelResolutionRequest } from '../operations/panels';

/** Generates (or refines) a custom content HTML template. */
export type ResolveCustomContentTemplate = (params: {
  prompt: string;
  esqlQuery?: string;
  existingTemplate?: string;
  /** True when the panel already has an ES|QL query that is not changing, so the resolver can skip re-sampling. */
  hasExistingQuery?: boolean;
}) => Promise<ResolvedCustomContentTemplate>;

const resolveCustomContentState = async (
  request: CustomContentPanelResolutionRequest,
  resolveTemplate: ResolveCustomContentTemplate
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
 * ES|QL query unless the request replaces or removes it. On edits, `edit_panels`
 * has already checked that the existing panel is custom content.
 */
export const createCustomContentPanelResolver = ({
  resolveTemplate,
}: {
  resolveTemplate: ResolveCustomContentTemplate;
}) => {
  return async (request: CustomContentPanelResolutionRequest): Promise<PanelContentAttempt> => {
    const { operationType, identifier } = request;

    try {
      return {
        type: 'success',
        panelContent: {
          type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
          config: await resolveCustomContentState(request, resolveTemplate),
        },
      };
    } catch (error) {
      return createPanelFailureResult(operationType, identifier, getErrorMessage(error));
    }
  };
};
