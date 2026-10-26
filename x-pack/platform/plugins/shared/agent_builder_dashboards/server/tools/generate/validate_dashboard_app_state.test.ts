/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type {
  AttachmentPanel,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import {
  createDashboardAppStateValidator,
  isDashboardAppLensApiFormat,
} from './validate_dashboard_app_state';

const mockGetTransforms = jest.fn();

beforeEach(() => {
  mockGetTransforms.mockReset();
  mockGetTransforms.mockImplementation((type: string) =>
    type === 'markdown' || type === 'lens-dashboard-app' || type === 'vega'
      ? { schema: z.object({ content: z.string() }).strict() }
      : undefined
  );
});

const createValidator = () =>
  createDashboardAppStateValidator({ getTransforms: mockGetTransforms });

const validatePanel = (config: Record<string, unknown>, type = 'markdown') =>
  createValidator().validatePanel({
    id: 'panel',
    type,
    config,
    grid: { x: 0, y: 0, w: 24, h: 15 },
  } as AttachmentPanel);

describe('createDashboardAppStateValidator', () => {
  describe('validatePanel', () => {
    it('returns no problems for a valid panel', () => {
      expect(validatePanel({ content: '# Title' })).toEqual([]);
    });

    it('reports a config issue with its config path', () => {
      expect(validatePanel({ content: 1 })).toEqual([expect.stringMatching(/^config\.content: /)]);
    });

    it('reports one problem per unrecognized key', () => {
      expect(validatePanel({ content: '', size: 'l', color: 'red' })).toEqual([
        'config.size: Unrecognized key',
        'config.color: Unrecognized key',
      ]);
    });

    it('reports the issues of every union option', () => {
      mockGetTransforms.mockReturnValue({
        schema: z.union([
          z.object({ content: z.string() }),
          z.object({ ref_id: z.string() }).strict(),
        ]),
      });

      expect(validatePanel({ content: 1 })).toEqual([
        expect.stringMatching(
          /^config: No union option matched: \(content: .+\) \| \(ref_id: .+, Unrecognized keys: content\)$/
        ),
      ]);
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

      const [problem] = validatePanel(config);

      expect(problem).toHaveLength('config: '.length + 1001);
      expect(problem.endsWith('…')).toBe(true);
    });

    it('does not validate panels of a type without a schema', () => {
      expect(validatePanel({ content: 1 }, 'image')).toEqual([]);
    });

    it('does not validate vega panels', () => {
      expect(validatePanel({ spec: '{}' }, 'vega')).toEqual([]);
    });

    it('validates lens panels with the dashboard application lens schema', () => {
      validatePanel({ content: '' }, LENS_EMBEDDABLE_TYPE);

      expect(mockGetTransforms).toHaveBeenCalledWith('lens-dashboard-app');
    });
  });

  describe('validateDashboardFields', () => {
    it('returns no issues for valid dashboard fields', () => {
      expect(createValidator().validateDashboardFields({ title: 'Dashboard', panels: [] })).toEqual(
        []
      );
    });

    it('reports dashboard field issues at the field path', () => {
      expect(
        createValidator().validateDashboardFields({
          title: '',
          panels: [],
        } as DashboardAttachmentData)
      ).toEqual([{ path: ['title'], message: expect.any(String) }]);
    });
  });
});

describe('isDashboardAppLensApiFormat', () => {
  it('is true while the dashboard application lens transforms have a schema', () => {
    expect(isDashboardAppLensApiFormat({ getTransforms: mockGetTransforms })).toBe(true);
    expect(mockGetTransforms).toHaveBeenCalledWith('lens-dashboard-app');
  });

  it('is false when they have no schema', () => {
    mockGetTransforms.mockReturnValue({});

    expect(isDashboardAppLensApiFormat({ getTransforms: mockGetTransforms })).toBe(false);
  });
});
