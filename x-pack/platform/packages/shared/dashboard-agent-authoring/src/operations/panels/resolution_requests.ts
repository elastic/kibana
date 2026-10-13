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
  type EditPanelRequestInput,
  type PanelRequestInput,
  type PanelResolutionRequest,
} from '.';
import { isEsqlLensPanel } from './vis';

/** Error for content that cannot edit the existing panel because it targets another kind. */
export const getPanelEditError = (existingPanel: AttachmentPanel): string => {
  const { id, type } = existingPanel;
  const replaceHint = `To replace it with another kind of panel, remove "${id}" and add the new panel with a new id in the same call.`;
  const renderer = findPanelRenderer(type);
  if (renderer === 'lens' && !isEsqlLensPanel(existingPanel)) {
    return `Panel "${id}" is a Lens panel that is not backed by ES|QL, so it cannot be edited. ${replaceHint}`;
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

/** Maps a new-panel request input onto the resolution request for its renderer. */
export const toCreationResolutionRequest = (
  panelInput: PanelRequestInput,
  identifier: string
): PanelResolutionRequest => {
  const { query, esql } = panelInput;
  const base = { identifier, nlQuery: query, esql };

  if (panelInput.renderer === 'custom_content') {
    return { ...base, renderer: panelInput.renderer };
  }

  const { renderer, index, chartType } = panelInput;
  return { ...base, renderer, index, chartType };
};

/**
 * Builds the resolution request for a request edit of a panel the content can edit (see
 * `canEditPanel`). Lens and Vega edits may omit the renderer, which the existing panel then
 * decides. This is the only place an edit's renderer is decided; the resolvers trust the one on
 * the request.
 */
export const toEditResolutionRequest = (
  panelInput: EditPanelRequestInput,
  existingPanel: AttachmentPanel
): PanelResolutionRequest => {
  const base = {
    identifier: panelInput.panelId,
    existingPanel,
  };

  if (panelInput.renderer === 'custom_content') {
    const { query, esql } = panelInput;
    return { ...base, renderer: panelInput.renderer, nlQuery: query, esql };
  }

  const renderer = findPanelRenderer(existingPanel.type);
  if (renderer !== 'lens' && renderer !== 'vega') {
    throw new Error(`Panel "${existingPanel.id}" cannot be edited with a Lens or Vega request.`);
  }
  const { query, esql, chartType, preserveESQL } = panelInput;
  return {
    ...base,
    renderer,
    nlQuery: query,
    esql,
    chartType,
    preserveESQL,
    applyChartRules: panelInput.renderer === 'vega' ? undefined : panelInput.applyChartRules,
  };
};
