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
  preparePanelsForReview,
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
  const prompt = getDashboardReviewSystemPrompt(preparePanelsForReview(dashboardData));

  it('includes panel design and palettes while leaving composition and layout to the main agent', () => {
    expect(prompt).not.toContain('Dashboard Composition Guidelines');
    expect(prompt).not.toContain('Grid Packing Rules');
    expect(prompt).not.toContain('Grid sizes by chart type');
    expect(prompt).toContain('CHART DESIGN GUIDANCE');
    expect(prompt).toContain('COLOR GUIDANCE');
    expect(prompt).toContain('KIBANA PALETTE CATALOG');
  });

  it('keeps Lens JSON mechanics with the config author', () => {
    expect(prompt).not.toContain('apply_color_to');
    expect(prompt).not.toContain('CONFIGURATION RULES');
  });

  it('states the review rules the main agent relies on', () => {
    expect(prompt).toContain('Check only whether the panels apply the chart defaults listed below');
    expect(prompt).toContain('no separate problem description or rationale');
    expect(prompt).toContain('Use exact ids and cover every panel');
    expect(prompt).toContain('leave semantic renaming to the main agent');
    expect(prompt).toContain('Do not infer an unknown unit or scale');
    expect(prompt).toContain('Every correction must preserve');
    expect(prompt).toContain('Preserve intent');
    expect(prompt).toContain('self-contained');
  });

  it.each(['line', 'area', 'bar', 'bar_horizontal'])(
    'includes color-reset defaults for %s series while retaining the original config',
    (seriesType) => {
      const config = {
        type: 'xy',
        layers: [
          {
            type: seriesType,
            y: [{ column: 'Requests', color: { type: 'static', color: '#ff00ff' } }],
          },
        ],
      };
      const messages = createDashboardReviewPrompt({
        dashboardData: {
          title: 'Logs',
          panels: [{ id: 'xy-1', type: LENS_EMBEDDABLE_TYPE, grid, config }],
        },
        userPreferences: 'Keep the error series red.',
      });
      const [, systemPrompt] = messages[0] as [string, string];
      const human = messages[1] as { content: string };

      expect(systemPrompt).toContain(
        'remove existing static series colors and custom breakdown color overrides'
      );
      expect(systemPrompt).toContain(
        'unless explicitly requested by the user or justified by clear semantic meaning'
      );
      expect(systemPrompt).not.toContain('an unusual color may be intentional');
      expect(human.content).toContain(JSON.stringify(config));
      expect(human.content).toContain('Keep the error series red.');
    }
  );
});

describe('preparePanelsForReview', () => {
  it('drops generated custom content templates and truncates oversized text, keeping ids', () => {
    const prepared = preparePanelsForReview(dashboardData);
    const custom = prepared[1];

    expect(custom.id).toBe('custom-1');
    expect(custom.config).not.toHaveProperty('template');
    expect(custom.config.prompt).toBe('status board');
    expect(custom.config.note as string).toContain('[truncated 500 characters]');
    expect(prepared.map(({ id }) => id)).toEqual(['metric-1', 'custom-1']);
    expect(prepared.every((panel) => !('grid' in panel))).toBe(true);
    expect(prepared[0].config).toEqual({ type: 'metric', title: 'Hits' });
    expect(JSON.stringify(dashboardData)).toContain('<div>huge</div>');
  });
});

describe('createDashboardReviewPrompt', () => {
  const userPreferences = 'Keep the existing colors.';

  it('reviews the config without adding context when no user preferences are supplied', () => {
    const messages = createDashboardReviewPrompt({ dashboardData });
    const human = messages[1] as { content: string };

    expect(human.content).toContain('<panels>');
    expect(human.content).not.toContain('<user_preferences>');
    expect(human.content).not.toContain('undefined');
  });

  it('selects defaults from Lens panels including panels inside sections', () => {
    const messages = createDashboardReviewPrompt({
      dashboardData: {
        ...dashboardData,
        panels: [
          dashboardData.panels[0],
          {
            id: 'section-2',
            title: 'Details',
            collapsed: false,
            grid: { y: 5 },
            panels: [
              { id: 'gauge-1', type: LENS_EMBEDDABLE_TYPE, grid, config: { type: 'gauge' } },
              {
                id: 'custom-2',
                type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
                grid,
                config: { type: 'xy' },
              },
              { id: 'unknown-1', type: LENS_EMBEDDABLE_TYPE, grid, config: { type: 'unknown' } },
            ],
          },
        ],
      },
    });
    const [, systemPrompt] = messages[0] as [string, string];

    expect(systemPrompt.split('\n')).toContain('metric:');
    expect(systemPrompt.split('\n')).toContain('gauge:');
    expect(systemPrompt.split('\n')).not.toContain('xy:');
    expect(systemPrompt.split('\n')).not.toContain('unknown:');
  });

  it('produces a system turn and one human turn without conversation history', () => {
    const messages = createDashboardReviewPrompt({ dashboardData, userPreferences });

    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual(['system', expect.any(String)]);
    const human = messages[1] as { content: string };
    expect(human.content).toContain(`<user_preferences>${userPreferences}</user_preferences>`);
    expect(human.content).toContain('<panels>');
    expect(human.content).toContain('"id":"metric-1"');
    expect(human.content).not.toContain('"id":"section-1"');
    expect(human.content).not.toContain('"grid"');
    expect(human.content).not.toContain('"title":"Logs"');
    expect(human.content).not.toContain('<div>huge</div>');
    expect(human.content).toContain('No screenshot is available');
  });

  it('attaches the screenshot as image content when provided', () => {
    const messages = createDashboardReviewPrompt({
      dashboardData,
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
