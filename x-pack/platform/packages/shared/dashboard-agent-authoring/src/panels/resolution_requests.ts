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
  findPanelKind,
  isConfigPanelContent,
  type PanelRequestContent,
  type PanelResolutionRequest,
  type UpsertPanelContent,
} from './registry';

/**
 * Error for content that cannot edit the existing panel: it targets another kind or is an
 * attachment, or the panel is one its kind cannot edit (`canEdit`) or of an unknown type, which are
 * replaced only after the user confirms. Undefined when the content can edit the panel.
 */
const getPanelEditError = (
  content: UpsertPanelContent,
  existingPanel: AttachmentPanel
): string | undefined => {
  const { id, type } = existingPanel;
  const replaceHint = `To replace it with another kind of panel, remove "${id}" and add the new panel with a new id in the same call.`;
  const confirmReplaceHint = `Tell the user it cannot be edited, and replace it only after they confirm: then remove "${id}" and add the new panel with a new id in the same call.`;
  const kind = findPanelKind(type);
  if (kind?.canEdit && !kind.canEdit(existingPanel)) {
    return `Panel "${id}" is a ${
      kind.uneditableDescription ?? `${kind.label} panel`
    }, so it cannot be edited. ${confirmReplaceHint}`;
  }
  if (!kind) {
    return `Panel "${id}" with type "${type}" cannot be edited. ${confirmReplaceHint}`;
  }
  if (content.type === 'attachment') {
    return `Panel "${id}" already exists, and attachments only add new panels. To replace it with the attachment, remove "${id}" and add the attachment with a new id in the same call.`;
  }
  if (content.type === kind.type) {
    return undefined;
  }
  return `Panel "${id}" is a ${kind.label} panel. Edit it with type: "${kind.type}". ${replaceHint}`;
};

type ResolutionRequestResult = { request: PanelResolutionRequest } | { error: string };

/** Maps request content for a new panel onto the resolution request of its kind. */
const toCreationResolutionRequest = (
  content: PanelRequestContent,
  id: string
): ResolutionRequestResult => {
  if (content.type === 'custom_content') {
    const { type, query, esql, hasData, regenerateESQL, index } = content;
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
      request: { type, nlQuery: query, esql: esql ?? undefined, hasData, index },
    };
  }

  const { type, query, index, esql, chartType } = content;
  if (type === 'vis' && chartType === undefined) {
    return {
      error: `Panel "${id}" is new. Provide \`chartType\` to create a Lens panel.`,
    };
  }
  return { request: { type, nlQuery: query, index, esql, chartType } };
};

/** Builds the resolution request for request content that edits a panel of the same kind (see `getPanelEditError`). */
const toEditResolutionRequest = (
  content: PanelRequestContent,
  existingPanel: AttachmentPanel
): ResolutionRequestResult => {
  const base = { existingPanel };

  if (content.type === 'custom_content') {
    const { type, query, esql, hasData, regenerateESQL, index } = content;
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
      request: { ...base, type, nlQuery: query, esql, hasData, regenerateESQL, index },
    };
  }

  const { type, query, index, esql, chartType, preserveESQL } = content;
  return {
    request: {
      ...base,
      type,
      nlQuery: query,
      index,
      esql,
      chartType,
      preserveESQL,
      applyChartRules: content.type === 'vis' ? content.applyChartRules : undefined,
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

  if (isConfigPanelContent(content)) {
    const { type, config } = content;
    const panelContent = buildConfigPanelContent(type, config);
    return 'error' in panelContent
      ? { error: `Panel "${id}": ${panelContent.error}` }
      : { source: 'config', panelContent };
  }

  if (content.type === 'attachment') {
    return { source: 'attachment', attachmentId: content.attachment_id };
  }

  const result = existingPanel
    ? toEditResolutionRequest(content, existingPanel)
    : toCreationResolutionRequest(content, id);
  return 'error' in result ? result : { source: 'request', request: result.request };
};
