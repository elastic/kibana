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
const mockRectAnnotation = jest.fn((_props: { dataValues: unknown[] }) => null);

interface MockTooltipProps {
  body: (args: { items: Array<{ datum: Record<string, unknown> }> }) => React.ReactNode;
}

jest.mock('@elastic/charts', () => ({
  ...jest.requireActual('@elastic/charts'),
  Axis: () => null,
  Chart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineSeries: () => null,
  RectAnnotation: (props: { dataValues: unknown[] }) => mockRectAnnotation(props),
  Settings: (props: SettingsSpec) => mockSettings(props),
  Tooltip: ({ body }: MockTooltipProps) => (
    <>
      {body({
        items: [
          {
            datum: {
              episodeId: 'episode-id',
              status: 'active',
              x: 1_000,
            },
          },
        ],
      })}
    </>
  ),
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
  it('keeps transitions at both edges of the time window fully visible', () => {
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
          chartPaddings: { top: 0, right: 5.5, bottom: 0, left: 5.5 },
        }),
      })
    );
  });

  it('uses the lifecycle band thickness', () => {
    render(
      <AlertTimelineRow
        row={{
          ...mockRow,
          segments: [
            {
              episodeId: 'episode-id',
              status: 'active',
              x0Ms: 1_000,
              x1Ms: 2_000,
              trueStartMs: 1_000,
            },
          ],
        }}
        windowStartMs={1_000}
        windowEndMs={2_000}
        height={44}
        baseTheme={LIGHT_THEME}
      />
    );

    expect(mockRectAnnotation).toHaveBeenCalledWith(
      expect.objectContaining({
        dataValues: [
          expect.objectContaining({
            coordinates: expect.objectContaining({ y0: 0.375, y1: 0.625 }),
          }),
        ],
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

  it('shows the episode ID in tooltips by default', () => {
    render(
      <AlertTimelineRow
        row={mockRow}
        windowStartMs={1_000}
        windowEndMs={2_000}
        height={44}
        baseTheme={LIGHT_THEME}
      />
    );

    expect(screen.getByText('Alert ID')).toBeInTheDocument();
    expect(screen.getByText('episode-id')).toBeInTheDocument();
  });

  it('can hide the episode ID without changing the shared tooltip', () => {
    render(
      <AlertTimelineRow
        row={mockRow}
        windowStartMs={1_000}
        windowEndMs={2_000}
        height={44}
        baseTheme={LIGHT_THEME}
        showEpisodeId={false}
      />
    );

    expect(screen.queryByText('Episode ID')).not.toBeInTheDocument();
    expect(screen.queryByText('episode-id')).not.toBeInTheDocument();
    expect(screen.getByText('Transitioned at')).toBeInTheDocument();
  });
});
