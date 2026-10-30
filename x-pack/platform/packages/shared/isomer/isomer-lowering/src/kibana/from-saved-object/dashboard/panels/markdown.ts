/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdaptivePanel } from '../../../model/adaptive_dashboard';

import { type LowerPanelArgs, unsupportedPanel } from './types';

interface MarkdownState {
  content?: unknown;
  title?: unknown;
  hide_title?: unknown;
}

/** The `markdown` embeddable (Kibana 9.4), by value in the panel or by reference to a `markdown` saved object. */
export const lowerMarkdownPanel = (args: LowerPanelArgs): AdaptivePanel => {
  const { panel, panelEnvelope, refId, diagnostics } = args;
  const byValue = panel.embeddableConfig as MarkdownState | undefined;
  const stored = panelEnvelope?.attributes as MarkdownState | undefined;
  const content = stored?.content ?? byValue?.content;
  if (typeof content !== 'string') {
    diagnostics.push({
      level: 'warn',
      code: 'dashboard.markdown-empty',
      message: `Markdown panel "${refId ?? '<inline>'}" has no content`,
    });
    return unsupportedPanel({ ...args, reason: 'Markdown panel has no content' });
  }
  const title = [panel.title, byValue?.title, stored?.title].find(
    (candidate): candidate is string => typeof candidate === 'string' && candidate.trim() !== ''
  );
  return {
    type: 'markdown',
    body: content,
    ...(title && byValue?.hide_title !== true ? { title } : {}),
  };
};
