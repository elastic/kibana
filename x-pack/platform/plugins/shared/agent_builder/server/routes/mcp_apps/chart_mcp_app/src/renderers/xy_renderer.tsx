/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  Chart,
  Settings,
  Axis,
  BarSeries,
  LineSeries,
  AreaSeries,
  Position,
  ScaleType,
  StackMode,
  CurveType,
} from '@elastic/charts';

import type { XYState, XYLayerESQL, EsqlData } from '../types';
import { toRowObjects, colName, colLabel, columnType, isDateType } from './data_utils';
import { baseTheme, transparentBackground } from './chart_theme';

interface XYRendererProps {
  spec: XYState;
  data: EsqlData;
}

const resolveXScaleType = (layer: XYLayerESQL, data: EsqlData): ScaleType => {
  const xCol = colName(layer.x);
  if (!xCol) return ScaleType.Ordinal;

  const esqlType = columnType(data, xCol);
  if (isDateType(esqlType)) return ScaleType.Time;

  if (
    esqlType === 'long' ||
    esqlType === 'integer' ||
    esqlType === 'double' ||
    esqlType === 'float'
  ) {
    return ScaleType.Linear;
  }

  return ScaleType.Ordinal;
};

const seriesTypeToComponent = (type: string) => {
  if (type.startsWith('bar')) return BarSeries;
  if (type.startsWith('area')) return AreaSeries;
  return LineSeries;
};

const isStacked = (type: string): boolean => type.includes('stacked');

const isPercentage = (type: string): boolean => type.includes('percentage');

const isHorizontal = (type: string): boolean => type.includes('horizontal');

const getCurveType = (spec: XYState): CurveType | undefined => {
  const interpolation = spec.decorations?.line_interpolation;
  if (interpolation === 'smooth') return CurveType.CURVE_MONOTONE_X;
  if (interpolation === 'stepped') return CurveType.CURVE_STEP;
  return undefined;
};

const resolveRotation = (spec: XYState): 0 | 90 => {
  const hasHorizontal = spec.layers.some((l) => isHorizontal(l.type));
  return hasHorizontal ? 90 : 0;
};

const legendIsVisible = (spec: XYState): boolean => {
  if (!spec.legend) return false;
  return (
    spec.legend.visibility === 'visible' ||
    (spec.legend.visibility === 'auto' && spec.layers.some((l) => l.breakdown_by || l.y.length > 1))
  );
};

const legendPosition = (spec: XYState): Position => {
  if (spec.legend && !('inside' in spec.legend && spec.legend.inside)) {
    const pos = (spec.legend as { position?: string }).position;
    if (pos === 'top') return Position.Top;
    if (pos === 'left') return Position.Left;
    if (pos === 'right') return Position.Right;
  }
  return Position.Bottom;
};

export const XYRenderer: React.FC<XYRendererProps> = ({ spec, data }) => {
  const rotation = resolveRotation(spec);

  return (
    <Chart>
      <Settings
        rotation={rotation}
        showLegend={legendIsVisible(spec)}
        legendPosition={legendPosition(spec)}
        theme={transparentBackground}
        baseTheme={baseTheme}
      />

      {/* X axis */}
      <Axis
        id="x"
        position={rotation === 90 ? Position.Left : Position.Bottom}
        title={spec.axis?.x?.title?.value ?? ''}
        showTitle={spec.axis?.x?.title?.visible !== false}
        tickFormat={
          spec.layers[0] && resolveXScaleType(spec.layers[0], data) === ScaleType.Time
            ? (d: number) => {
                const date = new Date(d);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }
            : undefined
        }
      />

      {/* Left Y axis */}
      <Axis
        id="left"
        position={rotation === 90 ? Position.Bottom : Position.Left}
        title={spec.axis?.left?.title?.value ?? ''}
        showTitle={spec.axis?.left?.title?.visible !== false}
      />

      {/* Right Y axis (only if some metric targets it) */}
      {spec.layers.some((l) => l.y.some((y) => (y as any).axis === 'right')) && (
        <Axis
          id="right"
          position={rotation === 90 ? Position.Top : Position.Right}
          title={spec.axis?.right?.title?.value ?? ''}
          showTitle={spec.axis?.right?.title?.visible !== false}
          groupId="right"
        />
      )}

      {spec.layers.map((layer, layerIdx) => {
        const rows = toRowObjects(data);
        const SeriesComponent = seriesTypeToComponent(layer.type);
        const xAccessor = colName(layer.x) || undefined;
        const xScale = layer.x ? resolveXScaleType(layer, data) : ScaleType.Ordinal;
        const stacked = isStacked(layer.type);
        const percentage = isPercentage(layer.type);
        const breakdownCol = layer.breakdown_by ? colName(layer.breakdown_by) : undefined;
        const curve = getCurveType(spec);

        return layer.y.map((yCol, yIdx) => {
          const yAccessor = colName(yCol);
          const groupId = (yCol as any).axis === 'right' ? 'right' : undefined;

          return (
            <SeriesComponent
              key={`layer-${layerIdx}-y-${yIdx}`}
              id={`${colLabel(yCol)}-${layerIdx}-${yIdx}`}
              name={colLabel(yCol)}
              xScaleType={xScale}
              yScaleType={ScaleType.Linear}
              xAccessor={xAccessor ?? '__index'}
              yAccessors={[yAccessor]}
              splitSeriesAccessors={breakdownCol ? [breakdownCol] : undefined}
              stackAccessors={stacked || percentage ? [xAccessor ?? '__index'] : undefined}
              stackMode={percentage ? StackMode.Percentage : undefined}
              data={xAccessor ? rows : rows.map((r, i) => ({ ...r, __index: i }))}
              groupId={groupId}
              curve={curve}
            />
          );
        });
      })}
    </Chart>
  );
};
