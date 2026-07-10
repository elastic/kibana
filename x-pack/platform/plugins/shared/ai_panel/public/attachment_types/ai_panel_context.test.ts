/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aiPanelContextAttachmentUiDefinition } from './ai_panel_context';

const buildAttachment = (panelInstructions: string) => ({
  id: 'attachment-1',
  type: 'platform.ai_panel.panel_context' as const,
  data: { panel_instructions: panelInstructions, esql_query: '' },
});

describe('aiPanelContextAttachmentUiDefinition', () => {
  it('labels the attachment with the panel instructions', () => {
    const label = aiPanelContextAttachmentUiDefinition.getLabel(buildAttachment('Show KPI cards'));
    expect(label).toBe('Panel: Show KPI cards');
  });

  it('truncates long instructions with an ellipsis', () => {
    const longPrompt = 'Show a status board of top product categories by revenue';
    const label = aiPanelContextAttachmentUiDefinition.getLabel(buildAttachment(longPrompt));
    expect(label).toBe('Panel: Show a status board of top product categ…');
  });

  it('falls back to a generic label when instructions are empty', () => {
    const label = aiPanelContextAttachmentUiDefinition.getLabel(buildAttachment('   '));
    expect(label).toBe('This panel');
  });

  it('uses the sparkles icon', () => {
    expect(aiPanelContextAttachmentUiDefinition.getIcon?.()).toBe('sparkles');
  });
});
