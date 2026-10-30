/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import type { PanelContent } from '../resolve_panel';
import {
  buildConfigPanelContent,
  findConfigPanelType,
  findPanelRenderer,
  getEditableEmbeddableTypes,
  type PanelRequestContent,
  type PanelResolutionRequest,
  type UpsertPanelContent,
} from './registry';
import { isEsqlLensPanel } from './vis';

/**
 * Error for content that cannot edit the existing panel: it targets another kind or is an
 * attachment, or the panel is a Lens panel not backed by ES|QL or of an unknown type, which are
 * replaced only after the user confirms. Undefined when the content can edit the panel.
 */
const getPanelEditError = (
  content: UpsertPanelContent,
  existingPanel: AttachmentPanel
): string | undefined => {
  const { id, type } = existingPanel;
  const replaceHint = `To replace it with another kind of panel, remove "${id}" and add the new panel with a new id in the same call.`;
  const confirmReplaceHint = `Tell the user it cannot be edited, and replace it only after they confirm: then remove "${id}" and add the new panel with a new id in the same call.`;
  const renderer = findPanelRenderer(type);
  if (renderer === 'lens' && !isEsqlLensPanel(existingPanel)) {
    return `Panel "${id}" is a Lens panel that is not backed by ES|QL, so it cannot be edited. ${confirmReplaceHint}`;
  }
  const configPanelType = findConfigPanelType(type);
  if (!renderer && !configPanelType) {
    return `Panel "${id}" with type "${type}" cannot be edited. ${confirmReplaceHint}`;
  }
  if (content.source === 'attachment') {
    return `Panel "${id}" already exists, and attachments only add new panels. To replace it with the attachment, remove "${id}" and add the attachment with a new id in the same call.`;
  }
  if (getEditableEmbeddableTypes(content).includes(type)) {
    return undefined;
  }
  if (configPanelType) {
    return `Panel "${id}" is a ${configPanelType.label} panel. Edit it with source: "config", type: "${configPanelType.type}". ${replaceHint}`;
  }
  return `Panel "${id}" is a ${renderer} panel. Edit it with source: "request", renderer: "${renderer}". ${replaceHint}`;
};

type ResolutionRequestResult = { request: PanelResolutionRequest } | { error: string };

/** Maps request content for a new panel onto the resolution request for its renderer. */
const toCreationResolutionRequest = (
  content: PanelRequestContent,
  id: string
): ResolutionRequestResult => {
  if (content.renderer === 'custom_content') {
    const { renderer, query, esql, hasData, regenerateESQL, index } = content;
    if (query === undefined || hasData === undefined) {
      const missing = [
        ...(query === undefined ? ['`query`'] : []),
        ...(hasData === undefined
          ? ['`hasData` (true to generate its ES|QL query, false for static content with no query)']
          : []),
      ];
      return { error: `Panel "${id}" is new. Provide ${missing.join(' and ')} to create it.` };
    }
    if (regenerateESQL) {
      return {
        error: `Panel "${id}" is new, so \`regenerateESQL\` does not apply. Use \`hasData\` to say whether it has a query.`,
      };
    }
    return {
      request: { renderer, nlQuery: query, esql: esql ?? undefined, hasData, index },
    };
  }

  const { renderer, query, index, esql, chartType } = content;
  if (renderer !== 'vega' && chartType === undefined) {
    return {
      error: `Panel "${id}" is new. Provide \`chartType\` to create a Lens panel.`,
    };
  }
  return { request: { renderer, nlQuery: query, index, esql, chartType } };
};

/**
 * Builds the resolution request for request content that edits a panel of the same kind (see
 * `getPanelEditError`). Lens and Vega edits may omit the renderer, which the existing panel then
 * decides. This is the only place an edit's renderer is decided; the resolvers trust the one on
 * the request.
 */
const toEditResolutionRequest = (
  content: PanelRequestContent,
  existingPanel: AttachmentPanel
): ResolutionRequestResult => {
  const base = { existingPanel };

  if (content.renderer === 'custom_content') {
    const { renderer, query, esql, hasData, regenerateESQL, index } = content;
    if (regenerateESQL && hasData === false) {
      return {
        error: `Panel "${existingPanel.id}" cannot combine \`regenerateESQL\` with \`hasData\`: false, which removes the query.`,
      };
    }
    if (esql === null && (hasData === true || regenerateESQL)) {
      return {
        error: `Panel "${existingPanel.id}" cannot combine \`esql\`: null, which removes the query, with \`hasData\`: true or \`regenerateESQL\`.`,
      };
    }
    const replacesQuery = typeof esql === 'string' && esql.trim() !== '';
    const removesQuery = esql === null || hasData === false;
    const changesOnlyQuery =
      !regenerateESQL && (replacesQuery || (removesQuery && hasData !== true));
    if (query === undefined && !changesOnlyQuery) {
      return {
        error: `Panel "${existingPanel.id}" edit needs \`query\` unless it only replaces the ES|QL query with a non-blank \`esql\` or removes it (\`esql\`: null, or \`hasData\`: false); \`regenerateESQL\` and \`hasData\`: true need it.`,
      };
    }
    return {
      request: { ...base, renderer, nlQuery: query, esql, hasData, regenerateESQL, index },
    };
  }

  const renderer = findPanelRenderer(existingPanel.type);
  if (renderer !== 'lens' && renderer !== 'vega') {
    return {
      error: `Panel "${existingPanel.id}" cannot be edited with a Lens or Vega request.`,
    };
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
      // Chart rules are Lens-only, so a Vega panel edited with `renderer` omitted ignores them.
      applyChartRules:
        renderer === 'vega' || content.renderer === 'vega' ? undefined : content.applyChartRules,
    },
  };
};

/** Where a panel's new content comes from; resolving it is left to the upsert. */
export type PanelContentSource =
  | { source: 'config'; panelContent: PanelContent }
  | { source: 'attachment'; attachmentId: string }
  | { source: 'request'; request: PanelResolutionRequest };

/**
 * Plans where a panel item's content comes from: an edit of the existing panel, which the content
 * must match in kind, or a new panel.
 */
export const planPanelContent = ({
  id,
  content,
  existingPanel,
}: {
  id: string;
  content: UpsertPanelContent;
  existingPanel?: AttachmentPanel;
}): PanelContentSource | { error: string } => {
  const editError = existingPanel && getPanelEditError(content, existingPanel);
  if (editError) {
    return { error: editError };
  }

  if (content.source === 'config') {
    const { type, config } = content;
    return { source: 'config', panelContent: buildConfigPanelContent(type, config) };
  }

  if (content.source === 'attachment') {
    return { source: 'attachment', attachmentId: content.attachment_id };
  }

  const result = existingPanel
    ? toEditResolutionRequest(content, existingPanel)
    : toCreationResolutionRequest(content, id);
  return 'error' in result ? result : { source: 'request', request: result.request };
};
