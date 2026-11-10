/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentPanel,
  DashboardAttachmentData,
  DashboardSection,
} from '@kbn/agent-builder-dashboards-common';
import type { DashboardValidator } from './validate_dashboard';
import { discardInvalidChanges } from './validate_dashboard';

const MAX_PANELS = 4;

const createPanel = (id: string, config: AttachmentPanel['config'] = {}): AttachmentPanel => ({
  id,
  type: 'markdown',
  config: { content: id, ...config },
  grid: { x: 0, y: 0, w: 24, h: 15 },
});

const createInvalidPanel = (id: string): AttachmentPanel => createPanel(id, { invalid: true });

const createSection = (
  id: string,
  panels: AttachmentPanel[],
  title: string = id
): DashboardSection => ({
  id,
  title,
  collapsed: false,
  grid: { y: 0 },
  panels,
});

/**
 * Flags panels and controls with an `invalid` key, empty titles, and more than `MAX_PANELS`
 * top-level entries, reporting each at the path the real dashboard schema would.
 */
const validator: DashboardValidator = {
  validatePanel: ({ config }) => (config.invalid ? ['config.invalid: Unrecognized key'] : []),
  validateDashboardFields: ({ title, panels, pinned_panels: pinnedPanels }) => [
    ...(title === '' ? [{ path: ['title'], message: 'Too small' }] : []),
    ...(pinnedPanels ?? []).flatMap((pinnedPanel, index) =>
      pinnedPanel.invalid
        ? [{ path: ['pinned_panels', index, 'invalid'], message: 'Unrecognized key' }]
        : []
    ),
    ...(panels.length > MAX_PANELS
      ? [{ path: ['panels'], message: `${panels.length} panels` }]
      : []),
  ],
};

describe('discardInvalidChanges', () => {
  it('returns the dashboard unchanged when it is valid', () => {
    const originalDashboardData = { title: 'Dashboard', panels: [createPanel('a')] };
    const dashboardData = { ...originalDashboardData, panels: [createPanel('b')] };

    expect(discardInvalidChanges({ originalDashboardData, dashboardData, validator })).toEqual({
      dashboardData,
      failures: [],
      discardedPanelIds: new Set(),
    });
  });

  it('drops an invalid new panel and keeps the panels after it', () => {
    const existingPanel = createPanel('a');
    const nextPanel = createPanel('c');
    const originalDashboardData = { title: 'Dashboard', panels: [existingPanel] };

    const result = discardInvalidChanges({
      originalDashboardData,
      dashboardData: {
        ...originalDashboardData,
        panels: [existingPanel, createInvalidPanel('b'), nextPanel],
      },
      validator,
    });

    expect(result.dashboardData.panels).toEqual([existingPanel, nextPanel]);
    expect(result.failures).toEqual([
      {
        type: 'validate_dashboard',
        kind: 'panel',
        identifier: 'b',
        error:
          'Panel was not added because the result does not match the dashboard schema: config.invalid: Unrecognized key',
      },
    ]);
    expect(result.discardedPanelIds).toEqual(new Set(['b']));
  });

  it('drops an invalid new panel inside a section', () => {
    const existingPanel = createPanel('a');
    const originalDashboardData = {
      title: 'Dashboard',
      panels: [createSection('section', [existingPanel])],
    };

    const result = discardInvalidChanges({
      originalDashboardData,
      dashboardData: {
        ...originalDashboardData,
        panels: [createSection('section', [existingPanel, createInvalidPanel('b')])],
      },
      validator,
    });

    expect(result.dashboardData.panels).toEqual([createSection('section', [existingPanel])]);
    expect(result.failures).toEqual([
      expect.objectContaining({
        identifier: 'b',
        error: expect.stringContaining('config.invalid'),
      }),
    ]);
  });

  it('drops a new section when none of its panels are valid', () => {
    const originalDashboardData = { title: 'Dashboard', panels: [] };

    const result = discardInvalidChanges({
      originalDashboardData,
      dashboardData: {
        ...originalDashboardData,
        panels: [createSection('section', [createInvalidPanel('b')], 'Errors')],
      },
      validator,
    });

    expect(result.dashboardData.panels).toEqual([]);
    expect(result.failures).toEqual([
      expect.objectContaining({ identifier: 'b' }),
      {
        type: 'validate_dashboard',
        kind: 'section',
        identifier: 'section',
        error: 'Section "Errors" was not added because none of its panels are valid.',
      },
    ]);
  });

  it('keeps a new section that was added empty', () => {
    const emptySection = createSection('section', []);
    const originalDashboardData = { title: 'Dashboard', panels: [] };

    const result = discardInvalidChanges({
      originalDashboardData,
      dashboardData: {
        ...originalDashboardData,
        panels: [emptySection, createInvalidPanel('b')],
      },
      validator,
    });

    expect(result.dashboardData.panels).toEqual([emptySection]);
  });

  it('reverts an invalid edit to the original type and config, and keeps the new grid', () => {
    const originalPanel = createPanel('a');
    const editedPanel: AttachmentPanel = {
      ...originalPanel,
      type: 'lens',
      config: { invalid: true },
      grid: { x: 24, y: 10, w: 12, h: 8 },
    };
    const originalDashboardData = { title: 'Dashboard', panels: [originalPanel] };

    const result = discardInvalidChanges({
      originalDashboardData,
      dashboardData: { ...originalDashboardData, panels: [editedPanel] },
      validator,
    });

    expect(result.dashboardData.panels).toEqual([
      { ...originalPanel, grid: { x: 24, y: 10, w: 12, h: 8 } },
    ]);
    expect(result.failures).toEqual([
      {
        type: 'validate_dashboard',
        kind: 'panel',
        identifier: 'a',
        error:
          'Panel was reverted to its state before this call because the result does not match the dashboard schema: config.invalid: Unrecognized key',
      },
    ]);
    expect(result.discardedPanelIds).toEqual(new Set(['a']));
  });

  it('ignores invalid panels the change did not touch, including ones moved into a section', () => {
    const untouchedPanel = createInvalidPanel('a');
    const movedPanel = createInvalidPanel('b');
    const originalDashboardData = { title: 'Dashboard', panels: [untouchedPanel, movedPanel] };
    const dashboardData = {
      ...originalDashboardData,
      panels: [untouchedPanel, createSection('section', [movedPanel])],
    };

    const result = discardInvalidChanges({
      originalDashboardData,
      dashboardData,
      validator,
    });

    expect(result).toEqual({ dashboardData, failures: [], discardedPanelIds: new Set() });
  });

  it('ignores invalid panels and controls the change copied without editing them', () => {
    const originalDashboardData = {
      title: 'Dashboard',
      panels: [createInvalidPanel('a')],
      pinned_panels: [{ invalid: true }],
    };
    const dashboardData = structuredClone(originalDashboardData);

    const result = discardInvalidChanges({
      originalDashboardData,
      dashboardData,
      validator,
    });

    expect(result).toEqual({ dashboardData, failures: [], discardedPanelIds: new Set() });
  });

  it('reverts an invalid edit to a panel that was already invalid', () => {
    const originalPanel = createInvalidPanel('a');
    const originalDashboardData = { title: 'Dashboard', panels: [originalPanel] };

    const result = discardInvalidChanges({
      originalDashboardData,
      dashboardData: {
        ...originalDashboardData,
        panels: [createPanel('a', { content: 'edited', invalid: true })],
      },
      validator,
    });

    expect(result.dashboardData.panels).toEqual([originalPanel]);
    expect(result.discardedPanelIds).toEqual(new Set(['a']));
  });

  it('names a panel by its id in failures', () => {
    const result = discardInvalidChanges({
      originalDashboardData: { title: 'Dashboard', panels: [] },
      dashboardData: {
        title: 'Dashboard',
        panels: [createPanel('b', { title: 'Errors', invalid: true })],
      },
      validator,
    });

    expect(result.failures).toEqual([expect.objectContaining({ identifier: 'b' })]);
  });

  it('drops invalid new controls and keeps invalid controls that already existed', () => {
    const existingControl = { id: 'existing', invalid: true };
    const validControl = { id: 'valid', field: 'host.name' };
    const originalDashboardData = {
      title: 'Dashboard',
      panels: [],
      pinned_panels: [existingControl],
    };

    const result = discardInvalidChanges({
      originalDashboardData,
      dashboardData: {
        ...originalDashboardData,
        pinned_panels: [
          existingControl,
          { id: 'new', field: 'host.os', invalid: true },
          validControl,
        ],
      },
      validator,
    });

    expect(result.dashboardData.pinned_panels).toEqual([existingControl, validControl]);
    expect(result.failures).toEqual([
      {
        type: 'validate_dashboard',
        kind: 'control',
        identifier: 'new',
        error:
          'Control was not added because the result does not match the dashboard schema: invalid: Unrecognized key',
      },
    ]);
  });

  it('leaves no controls list when all new controls of a dashboard without controls are dropped', () => {
    const originalDashboardData = { title: 'Dashboard', panels: [] };

    const result = discardInvalidChanges({
      originalDashboardData,
      dashboardData: { ...originalDashboardData, pinned_panels: [{ id: 'new', invalid: true }] },
      validator,
    });

    expect(result.dashboardData).toEqual(originalDashboardData);
  });

  it('keeps the removal of all existing controls when the new controls are dropped', () => {
    const originalDashboardData = {
      title: 'Dashboard',
      panels: [],
      pinned_panels: [{ id: 'existing', field: 'host.name' }],
    };

    const result = discardInvalidChanges({
      originalDashboardData,
      dashboardData: { ...originalDashboardData, pinned_panels: [{ id: 'new', invalid: true }] },
      validator,
    });

    expect(result.dashboardData).toEqual({ ...originalDashboardData, pinned_panels: [] });
  });

  it('reverts an invalid change to a dashboard field', () => {
    const originalDashboardData = { title: 'Dashboard', panels: [] };

    const result = discardInvalidChanges({
      originalDashboardData,
      dashboardData: { ...originalDashboardData, title: '' },
      validator,
    });

    expect(result.dashboardData.title).toBe('Dashboard');
    expect(result.failures).toEqual([
      {
        type: 'validate_dashboard',
        kind: 'dashboard',
        identifier: 'title',
        error:
          'Change to "title" was reverted because the result does not match the dashboard schema: Too small',
      },
    ]);
  });

  it('removes an invalid dashboard field that the original did not have', () => {
    const originalDashboardData = { title: 'Dashboard', panels: [] };

    const result = discardInvalidChanges({
      originalDashboardData,
      dashboardData: { ...originalDashboardData, time_range: { from: 'invalid', to: 'now' } },
      validator: {
        ...validator,
        validateDashboardFields: ({ time_range: timeRange }) =>
          timeRange ? [{ path: ['time_range', 'from'], message: 'Invalid' }] : [],
      },
    });

    expect(result.dashboardData).toEqual(originalDashboardData);
    expect(result.dashboardData).not.toHaveProperty('time_range');
    expect(result.failures).toEqual([expect.objectContaining({ identifier: 'time_range' })]);
  });

  it('reports at most 10 issues per failure', () => {
    const originalDashboardData = { title: 'Dashboard', panels: [] };

    const result = discardInvalidChanges({
      originalDashboardData,
      dashboardData: { ...originalDashboardData, title: '' },
      validator: {
        ...validator,
        validateDashboardFields: ({ title }) =>
          title === ''
            ? Array.from({ length: 12 }, (_, index) => ({
                path: ['title'],
                message: `Issue ${index}`,
              }))
            : [],
      },
    });

    const [{ error }] = result.failures;
    expect(error).toContain('Issue 9; and 2 more');
    expect(error).not.toContain('Issue 10');
  });

  it('discards every change when a new issue belongs to no single panel or field', () => {
    const originalDashboardData: DashboardAttachmentData = {
      title: 'Dashboard',
      panels: [createPanel('a')],
    };
    const newPanels = ['b', 'c', 'd', 'e'].map((id) => createPanel(id));

    const result = discardInvalidChanges({
      originalDashboardData,
      dashboardData: {
        ...originalDashboardData,
        title: 'Renamed',
        panels: [...originalDashboardData.panels, ...newPanels],
      },
      validator,
    });

    expect(result).toEqual({
      dashboardData: originalDashboardData,
      failures: [
        {
          type: 'validate_dashboard',
          kind: 'dashboard',
          identifier: 'dashboard',
          error:
            'All changes were discarded because the result does not match the dashboard schema: panels: 5 panels',
        },
      ],
      discardedPanelIds: new Set(['a', 'b', 'c', 'd', 'e']),
    });
  });
});
