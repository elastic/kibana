/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import {
  createDashboardReviewPrompt,
  getDashboardReviewSystemPrompt,
  prepareDashboardForReview,
} from './review_prompt';

const grid = { x: 0, y: 0, w: 12, h: 5 };
const dashboardData: DashboardAttachmentData = {
  title: 'Logs',
  panels: [
    { type: LENS_EMBEDDABLE_TYPE, id: 'metric-1', grid, config: { type: 'metric', title: 'Hits' } },
    {
      id: 'section-1',
      title: 'Details',
      collapsed: false,
      grid: { y: 5 },
      panels: [
        {
          type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
          id: 'custom-1',
          grid,
          config: { prompt: 'status board', template: '<div>huge</div>', note: 'x'.repeat(2500) },
        },
      ],
    },
  ],
};

describe('getDashboardReviewSystemPrompt', () => {
  const prompt = getDashboardReviewSystemPrompt();

  it('carries the shared composition, sizing, chart design, and palette guidance', () => {
    expect(prompt).toContain('Dashboard Composition Guidelines');
    expect(prompt).toContain('Grid Packing Rules');
    expect(prompt).toContain('Grid sizes by chart type');
    expect(prompt).toContain('CHART DESIGN GUIDANCE');
    expect(prompt).toContain('COLOR GUIDANCE');
    expect(prompt).toContain('KIBANA PALETTE CATALOG');
  });

  it('keeps Lens JSON mechanics with the config author', () => {
    expect(prompt).not.toContain('apply_color_to');
    expect(prompt).not.toContain('CONFIGURATION RULES');
  });

  it('states the review rules the main agent relies on', () => {
    expect(prompt).toContain('Use exact ids');
    expect(prompt).toContain('Cover every panel');
    expect(prompt).toContain('Separate data questions from presentation fixes');
    expect(prompt).toContain('Preserve intent');
    expect(prompt).toContain('self-contained');
  });
});

describe('prepareDashboardForReview', () => {
  it('drops generated custom content templates and truncates oversized text, keeping ids', () => {
    const prepared = prepareDashboardForReview(dashboardData);
    const section = prepared.panels[1] as {
      panels: Array<{ id: string; config: Record<string, unknown> }>;
    };
    const custom = section.panels[0];

    expect(custom.id).toBe('custom-1');
    expect(custom.config).not.toHaveProperty('template');
    expect(custom.config.prompt).toBe('status board');
    expect(custom.config.note as string).toContain('[truncated 500 characters]');
    expect(prepared.panels[0]).toEqual(dashboardData.panels[0]);
  });
});

describe('createDashboardReviewPrompt', () => {
  const context = { userRequest: 'prettify, keep the gauge bands' };

  it('produces a system turn and one human turn without conversation history', () => {
    const messages = createDashboardReviewPrompt({
      attachmentId: 'dash',
      version: 2,
      dashboardData,
      context,
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual(['system', expect.any(String)]);
    const human = messages[1] as { content: string };
    expect(human.content).toContain('<user_request>prettify, keep the gauge bands</user_request>');
    expect(human.content).toContain('<dashboard attachment_id="dash" version="2">');
    expect(human.content).toContain('"id":"metric-1"');
    expect(human.content).toContain('"id":"section-1"');
    expect(human.content).not.toContain('<div>huge</div>');
    expect(human.content).toContain('No screenshot is available');
  });

  it('attaches the screenshot as image content when provided', () => {
    const messages = createDashboardReviewPrompt({
      attachmentId: 'dash',
      version: 2,
      dashboardData,
      context,
      screenshot: { base64: 'QUJD', mimeType: 'image/jpeg' },
    });

    const human = messages[1] as {
      content: Array<{ type: string; text?: string; image_url?: { url: string } }>;
    };
    expect(human.content[0].text).toContain('shows this exact dashboard version');
    expect(human.content[1]).toEqual({
      type: 'image_url',
      image_url: { url: 'data:image/jpeg;base64,QUJD' },
    });
  });
});
