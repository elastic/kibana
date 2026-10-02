/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { LIGHT_THEME, type LineSeriesSpec, type SettingsSpec } from '@elastic/charts';
import { EpisodeSeverity } from '../components/severity/severity_utils';
import { EpisodeSeverityTimelineRow } from './episode_severity_timeline_row';

const mockLineSeries = jest.fn((_props: LineSeriesSpec) => null);
const mockSettings = jest.fn((_props: SettingsSpec) => null);
const mockRectAnnotation = jest.fn((_props: { dataValues: unknown[] }) => null);

jest.mock('@elastic/charts', () => ({
  ...jest.requireActual('@elastic/charts'),
  Axis: () => null,
  Chart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineSeries: (props: LineSeriesSpec) => mockLineSeries(props),
  RectAnnotation: (props: { dataValues: unknown[] }) => mockRectAnnotation(props),
  Tooltip: () => null,
  Settings: (props: SettingsSpec) => mockSettings(props),
}));

describe('EpisodeSeverityTimelineRow', () => {
  it('draws hollow transition dots at the start of each severity span', () => {
    render(
      <EpisodeSeverityTimelineRow
        segments={[
          {
            severity: EpisodeSeverity.Low,
            x0Ms: 1_000,
            x1Ms: 2_000,
            timestamp: '1970-01-01T00:00:01.000Z',
            eventData: { count: 1 },
          },
          {
            severity: EpisodeSeverity.High,
            x0Ms: 2_000,
            x1Ms: 3_000,
            timestamp: '1970-01-01T00:00:02.000Z',
            eventData: { count: 2 },
          },
        ]}
        windowStartMs={1_000}
        windowEndMs={3_000}
        height={44}
        baseTheme={LIGHT_THEME}
      />
    );

    expect(mockLineSeries).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'episode-severity-timeline-dots',
        data: [
          {
            x: 1_000,
            y: 0.5,
            severity: EpisodeSeverity.Low,
            segment: {
              severity: EpisodeSeverity.Low,
              x0Ms: 1_000,
              x1Ms: 2_000,
              timestamp: '1970-01-01T00:00:01.000Z',
              eventData: { count: 1 },
            },
          },
          {
            x: 2_000,
            y: 0.5,
            severity: EpisodeSeverity.High,
            segment: {
              severity: EpisodeSeverity.High,
              x0Ms: 2_000,
              x1Ms: 3_000,
              timestamp: '1970-01-01T00:00:02.000Z',
              eventData: { count: 2 },
            },
          },
        ],
        lineSeriesStyle: {
          line: { visible: false, opacity: 0 },
          point: { visible: 'always', radius: 4.5, fill: expect.any(String), strokeWidth: 2 },
        },
      })
    );
    expect(mockSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: expect.objectContaining({
          chartPaddings: { top: 0, right: 5.5, bottom: 0, left: 5.5 },
        }),
      })
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
    expect(mockLineSeries).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'episode-severity-timeline-end-caps' })
    );
  });

  it('reports the selected event when a transition dot is clicked', () => {
    const onTransitionClick = jest.fn();
    const segment = {
      severity: EpisodeSeverity.Critical,
      x0Ms: 1_000,
      x1Ms: 2_000,
      timestamp: '1970-01-01T00:00:01.000Z',
      eventData: { host: 'server-1' },
    };

    render(
      <EpisodeSeverityTimelineRow
        segments={[segment]}
        windowStartMs={1_000}
        windowEndMs={2_000}
        height={44}
        baseTheme={LIGHT_THEME}
        onTransitionClick={onTransitionClick}
      />
    );

    const settings = mockSettings.mock.calls.at(-1)?.[0];
    settings?.onElementClick?.([
      [
        {
          datum: {
            x: segment.x0Ms,
            y: 0.5,
            severity: segment.severity,
            segment,
          },
        },
      ],
    ] as never);

    expect(onTransitionClick).toHaveBeenCalledWith(segment);
  });
});
