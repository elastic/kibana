/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { createDashboardAppStateValidator } from './validate_dashboard_app_state';

const mockGetTransforms = jest.fn();

beforeEach(() => {
  mockGetTransforms.mockReset();
  mockGetTransforms.mockImplementation((type: string) =>
    type === 'markdown' || type === 'lens-dashboard-app'
      ? { schema: z.object({ content: z.string() }).strict() }
      : undefined
  );
});

const validate = (dashboardData: unknown) =>
  createDashboardAppStateValidator({ getTransforms: mockGetTransforms })(
    dashboardData as DashboardAttachmentData
  );

const createPanel = (
  config: Record<string, unknown> = { content: '# Title' },
  type = 'markdown'
) => ({
  id: 'panel',
  type,
  config,
  grid: { x: 0, y: 0, w: 24, h: 15 },
});

const createSection = (panels: unknown[]) => ({
  id: 'section',
  title: 'Section',
  collapsed: false,
  grid: { y: 0 },
  panels,
});

const createDashboard = (panels: unknown[]) => ({ title: 'Dashboard', panels });

describe('validateDashboardAppState', () => {
  it('returns no issues for a valid dashboard', () => {
    expect(validate(createDashboard([createPanel(), createSection([createPanel()])]))).toEqual([]);
  });

  it('reports a panel config issue at the panel path', () => {
    expect(validate(createDashboard([createPanel({ content: 1 })]))).toEqual([
      { path: ['panels', 0, 'config', 'content'], message: expect.any(String) },
    ]);
  });

  it('reports a panel config issue inside a section at the panel path', () => {
    expect(validate(createDashboard([createSection([createPanel({ content: 1 })])]))).toEqual([
      { path: ['panels', 0, 'panels', 0, 'config', 'content'], message: expect.any(String) },
    ]);
  });

  it('reports one issue per unrecognized key', () => {
    expect(
      validate(createDashboard([createPanel({ content: '', size: 'l', color: 'red' })]))
    ).toEqual([
      { path: ['panels', 0, 'config', 'size'], message: 'Unrecognized key' },
      { path: ['panels', 0, 'config', 'color'], message: 'Unrecognized key' },
    ]);
  });

  it('reports the issues of every union option', () => {
    mockGetTransforms.mockReturnValue({
      schema: z.union([
        z.object({ content: z.string() }),
        z.object({ ref_id: z.string() }).strict(),
      ]),
    });

    const [issue] = validate(createDashboard([createPanel({ content: 1 })]));

    expect(issue.path).toEqual(['panels', 0, 'config']);
    expect(issue.message).toMatch(
      /^No union option matched: \(content: .+\) \| \(ref_id: .+, Unrecognized keys: content\)$/
    );
  });

  it('truncates long union messages', () => {
    mockGetTransforms.mockReturnValue({
      schema: z.union([
        z.object({ content: z.string() }).strict(),
        z.object({ ref_id: z.string() }).strict(),
      ]),
    });
    const config = Object.fromEntries(
      Array.from({ length: 100 }, (_, index) => [`unknown_key_${index}`, 1])
    );

    const [issue] = validate(createDashboard([createPanel(config)]));

    expect(issue.message).toHaveLength(1001);
    expect(issue.message.endsWith('…')).toBe(true);
  });

  it('does not validate panels of a type without a schema', () => {
    expect(validate(createDashboard([createPanel({ spec: '{}' }, 'vega')]))).toEqual([]);
  });

  it('validates lens panels with the dashboard application lens schema', () => {
    validate(createDashboard([createPanel({ content: '' }, LENS_EMBEDDABLE_TYPE)]));

    expect(mockGetTransforms).toHaveBeenCalledWith('lens-dashboard-app');
  });

  it('reports dashboard field issues at the field path', () => {
    expect(validate({ ...createDashboard([]), title: '' })).toEqual([
      { path: ['title'], message: expect.any(String) },
    ]);
  });
});
