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

export const getUneditablePanelError = ({ id, type }: AttachmentPanel): string => {
  const configPanelType = findConfigPanelType(type);
  return configPanelType
    ? `Panel "${id}" is a ${configPanelType.label} panel. Edit it with source: "config", type: "${configPanelType.type}".`
    : `Panel "${id}" with type "${type}" is not supported for inline editing.`;
};

/**
 * Error for a request without a `renderer` on a panel that Lens and Vega edits cannot target.
 * Without a renderer the request edits the panel, so it is rejected instead of replacing it.
 */
export const getRendererlessEditError = (existingPanel: AttachmentPanel): string => {
  const replaceHint = 'To replace the panel with generated content, set `renderer` explicitly.';
  const renderer = findPanelRenderer(existingPanel.type);
  if (renderer === 'lens') {
    return `Panel "${existingPanel.id}" is a Lens panel that is not backed by ES|QL, so it cannot be edited. To replace it with a new ES|QL Lens chart, set renderer: "lens" and describe the full chart (query, index, chartType).`;
  }
  if (renderer === 'custom_content') {
    return `Panel "${existingPanel.id}" is a custom content panel. Edit it with source: "request", renderer: "custom_content". ${replaceHint}`;
  }
  return `${getUneditablePanelError(existingPanel)} ${replaceHint}`;
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
 * Builds the resolution request for a request edit. Lens and Vega edits may
 * omit the renderer, which the existing panel then decides. Custom content
 * edits must name it: without it the edit is parsed as a Lens edit, which lacks
 * custom content's fields. An explicit renderer that disagrees with the panel
 * fails instead of being rewritten. This is the only place an edit's renderer is
 * decided; the resolvers trust the one on the request.
 */
export const toEditResolutionRequest = (
  panelInput: EditPanelRequestInput,
  existingPanel: AttachmentPanel
): { request: PanelResolutionRequest } | { error: string } => {
  const renderer = findPanelRenderer(existingPanel.type);
  if (!renderer) {
    return { error: getUneditablePanelError(existingPanel) };
  }
  if (panelInput.renderer && panelInput.renderer !== renderer) {
    return {
      error: `Panel "${existingPanel.id}" with type "${existingPanel.type}" cannot be edited with renderer: "${panelInput.renderer}". Use renderer: "${renderer}".`,
    };
  }

  const base = {
    identifier: panelInput.panelId,
    existingPanel,
  };

  if (panelInput.renderer === 'custom_content') {
    const { query, esql } = panelInput;
    return { request: { ...base, renderer: panelInput.renderer, nlQuery: query, esql } };
  }
  if (renderer === 'custom_content') {
    return {
      error: `Panel "${existingPanel.id}" is a custom content panel. Edit it with source: "request", renderer: "custom_content".`,
    };
  }

  const { query, esql, chartType, preserveESQL } = panelInput;
  return {
    request: {
      ...base,
      renderer,
      nlQuery: query,
      esql,
      chartType,
      preserveESQL,
      applyChartRules: panelInput.renderer === 'vega' ? undefined : panelInput.applyChartRules,
    },
  };
};
