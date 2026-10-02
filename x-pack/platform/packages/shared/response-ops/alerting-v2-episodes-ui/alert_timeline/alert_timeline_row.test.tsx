/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LIGHT_THEME, type SettingsSpec } from '@elastic/charts';
import type { AlertTimelineSeries } from './types';
import { AlertTimelineRow } from './alert_timeline_row';

const mockSettings = jest.fn((_props: SettingsSpec) => null);

jest.mock('@elastic/charts', () => ({
  ...jest.requireActual('@elastic/charts'),
  Axis: () => null,
  Chart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineSeries: () => null,
  RectAnnotation: () => null,
  Settings: (props: SettingsSpec) => mockSettings(props),
  Tooltip: () => null,
}));

jest.mock('@kbn/core-di', () => ({
  PluginStart: (key: string) => `plugin.start.${key}`,
}));

jest.mock('@kbn/core-di-browser', () => ({
  useService: () => ({ theme: { useChartsBaseTheme: () => ({}) } }),
}));

const mockRow: AlertTimelineSeries = {
  groupHash: 'group-hash',
  groupingValues: {},
  segments: [],
  transitions: [
    {
      episodeId: 'episode-id',
      status: 'active',
      tsMs: 1_000,
    },
  ],
  firstEventMs: 1_000,
  lastEventMs: 1_000,
  hasOpenEpisode: true,
  longestOpenDurationMs: 0,
  episodeCount: 1,
};

describe('AlertTimelineRow', () => {
  it('keeps a transition at the start of the time window fully visible', () => {
    render(
      <AlertTimelineRow
        row={mockRow}
        windowStartMs={1_000}
        windowEndMs={2_000}
        height={44}
        baseTheme={LIGHT_THEME}
      />
    );

    expect(mockSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: expect.objectContaining({
          chartPaddings: { top: 0, right: 0, bottom: 0, left: 4 },
        }),
      })
    );
  });

  it('draws the row separator without reducing the chart content height', () => {
    render(
      <AlertTimelineRow
        row={mockRow}
        windowStartMs={1_000}
        windowEndMs={2_000}
        height={44}
        baseTheme={LIGHT_THEME}
      />
    );

    const rowElement = screen.getByTestId('alertTimelineRow');
    expect(getComputedStyle(rowElement).boxShadow).toContain('inset 0 1px');
  });
});
