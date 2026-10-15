/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement as h, type ReactNode } from 'react';
import {
  AnnotationDomainType,
  AreaSeries,
  Axis,
  BarSeries,
  Chart,
  CurveType,
  Fit,
  LineAnnotation,
  LineSeries,
  Position,
  RectAnnotation,
  ScaleType,
  Settings,
  StackMode,
} from '@elastic/charts';
import {
  formatTime,
  formatValue,
  type LiveChartProps,
  resolveXy,
  type SelectionTarget,
  timeValue,
  type XyChartNode,
} from '@kbn/isomer-primitives-charts';

import type { ChartHint } from './hints';

type AnnotationTone = ReturnType<typeof resolveXy>['annotations'][number]['tone'];
import { kibanaBaseTheme, lensXyTheme } from './theme';

/** Lens shades partial buckets with its dark shade, lighter in the light theme. */
const ENDZONE_OPACITY = { light: 0.2, dark: 0.6 } as const;

/** Lens fills an annotation range with its color at this opacity. */
const RANGE_OPACITY = 0.1;

/** Lens's default annotation marker: a triangle pointing at the line, or the count of events a bucket groups. */
const marker = (color: string, count: number): ReactNode =>
  h(
    'svg',
    { width: 16, height: 16, viewBox: '0 0 16 16', 'aria-hidden': true },
    count === 1
      ? h('path', { d: 'M2 4h12l-6 9z', fill: color })
      : [
          h('circle', { key: 'dot', cx: 8, cy: 8, r: 8, fill: color }),
          h(
            'text',
            {
              key: 'count',
              x: 8,
              y: 11.5,
              fill: '#FFFFFF',
              fontSize: 10,
              fontWeight: 700,
              textAnchor: 'middle',
            },
            String(count)
          ),
        ]
  );

const FIT = {
  gap: Fit.None,
  zero: Fit.Zero,
  carry: Fit.Carry,
  linear: Fit.Linear,
} as const;

const STACK_MODE = {
  none: undefined,
  stacked: undefined,
  percent: StackMode.Percentage,
  silhouette: StackMode.Silhouette,
} as const;

const CURVE = {
  linear: CurveType.LINEAR,
  monotone: CurveType.CURVE_MONOTONE_X,
  step: CurveType.CURVE_STEP_AFTER,
} as const;

const POSITION = {
  top: Position.Top,
  bottom: Position.Bottom,
  left: Position.Left,
  right: Position.Right,
} as const;

interface Row {
  x: string | number;
  y: number | null;
  /** The position's key, so a click resolves to the composition's identity. */
  key: string;
}

const isRow = (value: unknown): value is Row =>
  typeof value === 'object' && value !== null && typeof (value as Row).key === 'string';

interface AnnotationEvent {
  key: string;
  label: string;
  at: number | string;
  until?: number | string;
  color: string;
  count: number;
}

/** As Lens does: moments that share a time bucket draw as one marker at its start, counting them. */
const annotationEvents = (
  { annotations, time }: ReturnType<typeof resolveXy>,
  starts: readonly number[],
  hasBars: boolean,
  colorOf: (key: string, tone: AnnotationTone) => string
): AnnotationEvent[] => {
  const interval = time?.interval;
  const bucketOf = (at: number | string): number | undefined => {
    if (interval === undefined || typeof at !== 'number') {
      return undefined;
    }
    const start = [...starts].reverse().find((value) => value <= at);
    return start !== undefined && at < start + interval ? start : undefined;
  };
  const buckets = new Map<number, typeof annotations>();
  for (const annotation of annotations) {
    const bucket = annotation.until === undefined ? bucketOf(annotation.at) : undefined;
    if (bucket !== undefined) {
      buckets.set(bucket, [...(buckets.get(bucket) ?? []), annotation]);
    }
  }
  const grouped = new Set<string>();
  const events: AnnotationEvent[] = [];
  for (const [bucket, members] of buckets) {
    if (members.length < 2) {
      continue;
    }
    const [first] = members;
    members.forEach(({ key }) => grouped.add(key));
    events.push({
      key: `${first!.key}-group`,
      label: members.map(({ label }) => label).join(', '),
      at: hasBars ? bucket + interval! / 2 : bucket,
      color: colorOf(first!.key, first!.tone),
      count: members.length,
    });
  }
  for (const { key, label, at, until, tone } of annotations) {
    if (!grouped.has(key)) {
      events.push({
        key,
        label,
        at,
        ...(until === undefined ? {} : { until }),
        color: colorOf(key, tone),
        count: 1,
      });
    }
  }
  return events;
};

/** The xy chart as Lens draws it: one `Chart`, a series per spec series, axes per value axis. */
export const XyChart = ({
  node,
  theme,
  width,
  height,
  onSelect,
  hint = {},
}: LiveChartProps<XyChartNode & { type: 'xyChart' }> & {
  hint?: ChartHint;
}): ReactNode => {
  const resolved = resolveXy(node);
  const { positions, series, stack, missing, orientation, time } = resolved;
  const { x } = node;
  const xScaleType =
    x.type === 'category'
      ? ScaleType.Ordinal
      : x.type === 'time'
      ? ScaleType.Time
      : ScaleType.Linear;
  const xOf = (key: string): string | number =>
    x.type === 'time' ? timeValue(key) : x.type === 'number' ? Number(key) : key;
  const labelByKey = new Map(positions.map(({ key, label }) => [key, label]));
  const xTickFormat = (value: unknown): string =>
    x.type === 'time'
      ? formatTime(new Date(Number(value)).toISOString(), time!)
      : x.type === 'number'
      ? formatValue(Number(value), x.format)
      : labelByKey.get(String(value)) ?? String(value);
  const axisHint = hint.axes ?? {};
  // Axis positions are physical: a horizontal chart puts its categories on the left.
  const horizontal = orientation === 'horizontal';
  const valueAxis = (id: 'y' | 'y2') => {
    const spec = id === 'y' ? node.y : node.y2;
    const shown = axisHint[id];
    const format = stack === 'percent' ? { style: 'percent' as const } : spec?.format;
    return h(Axis, {
      key: id,
      id,
      groupId: id,
      position:
        id === 'y'
          ? horizontal
            ? Position.Bottom
            : Position.Left
          : horizontal
          ? Position.Top
          : Position.Right,
      ...(spec?.title !== undefined && shown?.title !== false ? { title: spec.title } : {}),
      tickFormat: (value: number) => formatValue(value, format),
      gridLine: { visible: shown?.gridlines ?? id === 'y' },
      hide: shown?.ticks === false && shown.title === false,
      ...(spec?.domain === undefined
        ? {}
        : {
            domain: {
              min: spec.domain.min ?? Number.NaN,
              max: spec.domain.max ?? Number.NaN,
            },
          }),
      ...(shown?.labelRotation === undefined
        ? {}
        : { style: { tickLabel: { rotation: shown.labelRotation } } }),
    });
  };
  const toned = (tone: keyof typeof theme.tone | undefined) =>
    tone === undefined ? theme.textSubdued : theme.tone[tone];
  const hasBars = series.some(({ kind }) => kind === 'bar');
  const bucketed = time?.interval !== undefined || resolved.bin !== undefined;
  // As Lens does: side-by-side bars keep their slots; anything else fills its bucket.
  const histogram =
    bucketed && (stack !== 'none' || series.filter(({ kind }) => kind === 'bar').length <= 1);
  const starts = positions.map(({ key }) => Number(xOf(key)));
  const xDomain = (() => {
    if (time?.interval === undefined) {
      if (time?.window !== undefined) {
        return { min: time.window.from, max: time.window.to };
      }
      return resolved.bin === undefined
        ? undefined
        : { min: Number.NaN, max: Number.NaN, minInterval: resolved.bin };
    }
    const { interval, window } = time;
    if (window === undefined || starts.length === 0) {
      return { min: Number.NaN, max: Number.NaN, minInterval: interval };
    }
    const max = Math.max(window.to - interval, starts.at(-1)!);
    return {
      min: Math.min(starts[0]!, window.from),
      max: hasBars ? max : max + interval,
      minInterval: interval,
    };
  })();
  const endzones =
    xDomain === undefined || Number.isNaN(xDomain.min) || time?.window === undefined
      ? []
      : [
          ...(time.window.from > xDomain.min
            ? [
                {
                  coordinates: {
                    x1: histogram ? time.window.from : xDomain.min,
                  },
                },
              ]
            : []),
          ...(time.window.to - time.interval! < xDomain.max
            ? [
                {
                  coordinates: { x0: histogram ? time.window.to : xDomain.max },
                },
              ]
            : []),
        ];
  const events = annotationEvents(
    resolved,
    starts,
    hasBars,
    (key, tone) => hint.colors?.[key] ?? (tone === undefined ? theme.text : theme.tone[tone])
  );
  return h(
    Chart,
    {
      size:
        width === undefined || height === undefined
          ? { width: '100%', height: '100%' }
          : { width, height },
    },
    h(Settings, {
      baseTheme: kibanaBaseTheme(theme.mode),
      theme: lensXyTheme,
      rotation: horizontal ? 90 : 0,
      ...(xDomain === undefined ? {} : { xDomain }),
      showLegend: hint.legend?.show ?? series.length > 1,
      legendPosition: POSITION[hint.legend?.position ?? 'right'],
      ...(onSelect
        ? {
            onElementClick: (elements: readonly unknown[]) => {
              const targets: SelectionTarget[] = elements.flatMap((element) => {
                const [geometry, identity] = element as [{ datum?: unknown }, { specId?: string }];
                return isRow(geometry.datum) && identity.specId !== undefined
                  ? [{ x: geometry.datum.key, series: identity.specId }]
                  : [];
              });
              onSelect(targets);
            },
          }
        : {}),
    }),
    h(Axis, {
      id: 'x',
      position: horizontal ? Position.Left : Position.Bottom,
      ...(x.title !== undefined && axisHint.x?.title !== false ? { title: x.title } : {}),
      tickFormat: xTickFormat,
      gridLine: { visible: axisHint.x?.gridlines ?? false },
      hide: axisHint.x?.ticks === false && axisHint.x.title === false,
      ...(axisHint.x?.labelRotation === undefined
        ? {}
        : { style: { tickLabel: { rotation: axisHint.x.labelRotation } } }),
    }),
    valueAxis('y'),
    node.y2 ? valueAxis('y2') : null,
    series.map((spec) => {
      const stacked = stack !== 'none' && spec.kind !== 'line';
      const rows: Row[] = positions.flatMap(({ key }, index) => {
        const value = spec.values[index];
        return value === undefined && spec.kind === 'bar'
          ? []
          : [{ x: xOf(key), y: value ?? null, key }];
      });
      const color = hint.colors?.[spec.key];
      const common = {
        key: spec.key,
        id: spec.key,
        name: spec.label,
        groupId: spec.axis,
        xScaleType,
        yScaleType:
          (spec.axis === 'y' ? node.y : node.y2)?.scale === 'log'
            ? ScaleType.Log
            : ScaleType.Linear,
        xAccessor: 'x',
        yAccessors: ['y'],
        // Lens rounds value axes to nice numbers by default.
        yNice: true,
        data: rows,
        ...(x.type === 'time' ? { timeZone: time!.timeZone } : {}),
        ...(stacked ? { stackAccessors: ['x'] } : {}),
        ...(stacked && STACK_MODE[stack] !== undefined ? { stackMode: STACK_MODE[stack] } : {}),
        ...(color === undefined ? {} : { color }),
      };
      if (spec.kind === 'bar') {
        return h(BarSeries, {
          ...common,
          enableHistogramMode: histogram,
          ...(hint.valueLabels ? { displayValueSettings: { showValueLabel: true } } : {}),
        });
      }
      const line = {
        ...common,
        fit: FIT[missing],
        ...(hint.curve === undefined ? {} : { curve: CURVE[hint.curve] }),
      };
      return spec.kind === 'area'
        ? h(AreaSeries, {
            ...line,
            ...(hint.fillOpacity === undefined
              ? {}
              : { areaSeriesStyle: { area: { opacity: hint.fillOpacity } } }),
          })
        : h(LineSeries, line);
    }),
    endzones.length === 0
      ? null
      : h(RectAnnotation, {
          id: '__endzones__',
          zIndex: 2,
          dataValues: endzones,
          style: {
            fill: theme.textSubdued,
            stroke: theme.textSubdued,
            strokeWidth: 0,
            opacity: ENDZONE_OPACITY[theme.mode],
          },
        }),
    events.map(({ key, label, at, until, color, count }) =>
      until === undefined
        ? h(LineAnnotation, {
            key: `annotation-${key}`,
            id: `annotation-${key}`,
            domainType: AnnotationDomainType.XDomain,
            dataValues: [{ dataValue: at, details: label }],
            marker: marker(color, count),
            markerPosition: horizontal ? Position.Left : Position.Top,
            style: { line: { stroke: color, strokeWidth: 1, opacity: 1 } },
          })
        : h(RectAnnotation, {
            key: `annotation-${key}`,
            id: `annotation-${key}`,
            dataValues: [{ coordinates: { x0: at, x1: until }, details: label }],
            style: { fill: color, opacity: RANGE_OPACITY },
          })
    ),
    resolved.thresholds.map(({ value, label, tone, axis }, index) =>
      h(LineAnnotation, {
        key: `threshold-${index}`,
        id: `threshold-${index}`,
        domainType: AnnotationDomainType.YDomain,
        groupId: axis,
        dataValues: [
          {
            dataValue: value,
            ...(label === undefined ? {} : { details: label }),
          },
        ],
        style: {
          line: {
            stroke: toned(tone),
            strokeWidth: 1,
            opacity: 1,
            dash: [4, 4],
          },
        },
      })
    )
  );
};
