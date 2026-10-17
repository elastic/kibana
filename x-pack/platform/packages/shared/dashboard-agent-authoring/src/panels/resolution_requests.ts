/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import {
  findConfigPanelType,
  findPanelRenderer,
  getEditableEmbeddableTypes,
  type PanelRequestContent,
  type PanelResolutionRequest,
  type UpsertPanelContent,
} from '.';
import { isEsqlLensPanel } from './vis';

/**
 * Error for content that cannot edit the existing panel: it targets another kind, or the panel is
 * a Lens panel not backed by ES|QL. Undefined when the content can edit the panel.
 */
export const getPanelEditError = (
  content: UpsertPanelContent,
  existingPanel: AttachmentPanel
): string | undefined => {
  const { id, type } = existingPanel;
  const replaceHint = `To replace it with another kind of panel, remove "${id}" and add the new panel with a new id in the same call.`;
  const renderer = findPanelRenderer(type);
  if (renderer === 'lens' && !isEsqlLensPanel(existingPanel)) {
    return `Panel "${id}" is a Lens panel that is not backed by ES|QL, so it cannot be edited. ${replaceHint}`;
  }
  if (getEditableEmbeddableTypes(content).includes(type)) {
    return undefined;
  }
  if (renderer) {
    return `Panel "${id}" is a ${renderer} panel. Edit it with source: "request", renderer: "${renderer}". ${replaceHint}`;
  }
  const configPanelType = findConfigPanelType(type);
  if (configPanelType) {
    return `Panel "${id}" is a ${configPanelType.label} panel. Edit it with source: "config", type: "${configPanelType.type}". ${replaceHint}`;
  }
  return `Panel "${id}" with type "${type}" cannot be edited. ${replaceHint}`;
};

type ResolutionRequestResult = { request: PanelResolutionRequest } | { error: string };

/** Maps request content for a new panel onto the resolution request for its renderer. */
export const toCreationResolutionRequest = (
  content: PanelRequestContent,
  identifier: string
): ResolutionRequestResult => {
  if (content.renderer === 'custom_content') {
    const { renderer, query, esql } = content;
    if (query === undefined) {
      return { error: `Panel "${identifier}" is new. Provide \`query\` to create it.` };
    }
    return { request: { identifier, renderer, nlQuery: query, esql: esql ?? undefined } };
  }

  const { renderer, query, index, esql, chartType } = content;
  if (renderer !== 'vega' && chartType === undefined) {
    return {
      error: `Panel "${identifier}" is new. Provide \`chartType\` to create a Lens panel.`,
    };
  }
  return { request: { identifier, renderer, nlQuery: query, index, esql, chartType } };
};

/**
 * Builds the resolution request for request content that edits a panel of the same kind (see
 * `getPanelEditError`). Lens and Vega edits may omit the renderer, which the existing panel then
 * decides. This is the only place an edit's renderer is decided; the resolvers trust the one on
 * the request.
 */
export const toEditResolutionRequest = (
  content: PanelRequestContent,
  existingPanel: AttachmentPanel
): ResolutionRequestResult => {
  const base = { identifier: existingPanel.id, existingPanel };

  if (content.renderer === 'custom_content') {
    const { renderer, query, esql } = content;
    if (query === undefined && esql === undefined) {
      return {
        error: `Panel "${existingPanel.id}" edit needs \`query\`, \`esql\`, or both.`,
      };
    }
    return { request: { ...base, renderer, nlQuery: query, esql } };
  }

  const renderer = findPanelRenderer(existingPanel.type);
  if (renderer !== 'lens' && renderer !== 'vega') {
    throw new Error(`Panel "${existingPanel.id}" cannot be edited with a Lens or Vega request.`);
  }
  const { query, index, esql, chartType, preserveESQL } = content;
  return {
    request: {
      ...base,
      renderer,
      nlQuery: query,
      index,
      esql,
      chartType,
      preserveESQL,
      applyChartRules: content.renderer === 'vega' ? undefined : content.applyChartRules,
    },
  };
};
