/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DASHBOARD_FAILURE_TYPES } from '../failure_types';
import { planSyncOptions } from './sync_options';

const tooltipSyncFailure = {
  type: DASHBOARD_FAILURE_TYPES.upsertDashboard,
  kind: 'dashboard',
  identifier: 'options.sync_tooltips',
  error: expect.stringContaining('Ask the user whether to turn cursor sync on'),
};

const conflictFailure = {
  ...tooltipSyncFailure,
  error: expect.stringContaining('because they conflict'),
};

describe('planSyncOptions', () => {
  it('leaves out tooltip sync turned on while cursor sync is off and keeps the other options', () => {
    const result = planSyncOptions({
      originalOptions: { sync_cursor: false, sync_tooltips: false },
      requestedOptions: { sync_tooltips: true, hide_panel_titles: true },
    });

    expect(result).toEqual({ options: { hide_panel_titles: true }, failure: tooltipSyncFailure });
  });

  it('turns tooltip sync off when the call turns cursor sync off', () => {
    const result = planSyncOptions({
      originalOptions: { sync_cursor: true, sync_tooltips: true },
      requestedOptions: { sync_cursor: false },
    });

    expect(result).toEqual({ options: { sync_cursor: false, sync_tooltips: false } });
  });

  it.each([
    ['a dashboard with both on', { sync_cursor: true, sync_tooltips: true }],
    ['a new dashboard', undefined],
  ])(
    'leaves out both when the call turns cursor sync off and tooltip sync on, on %s',
    (_, originalOptions) => {
      const result = planSyncOptions({
        originalOptions,
        requestedOptions: { sync_cursor: false, sync_tooltips: true, use_margins: false },
      });

      expect(result).toEqual({ options: { use_margins: false }, failure: conflictFailure });
    }
  );

  it('leaves an inconsistent stored pair alone when the call sets neither', () => {
    const result = planSyncOptions({
      originalOptions: { sync_cursor: false, sync_tooltips: true },
      requestedOptions: { hide_panel_borders: true },
    });

    expect(result).toEqual({ options: { hide_panel_borders: true } });
  });

  it('allows tooltip sync when cursor sync is unset, since it defaults to on', () => {
    const result = planSyncOptions({
      originalOptions: undefined,
      requestedOptions: { sync_tooltips: true },
    });

    expect(result).toEqual({ options: { sync_tooltips: true } });
  });

  it('allows turning both on while cursor sync was off', () => {
    const result = planSyncOptions({
      originalOptions: { sync_cursor: false },
      requestedOptions: { sync_cursor: true, sync_tooltips: true },
    });

    expect(result).toEqual({ options: { sync_cursor: true, sync_tooltips: true } });
  });

  it.each([
    ['tooltip sync', { sync_cursor: false }, { sync_tooltips: true }],
    [
      'both sync options',
      { sync_cursor: true, sync_tooltips: true },
      { sync_cursor: false, sync_tooltips: true },
    ],
  ])(
    'applies no options when the call asked only for the left-out %s, so the dashboard keeps its own',
    (_, originalOptions, requestedOptions) => {
      const result = planSyncOptions({ originalOptions, requestedOptions });

      expect(result.options).toBeUndefined();
    }
  );
});
