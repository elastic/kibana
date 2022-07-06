/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';

import * as d3Brush from 'd3-brush';
import * as d3Scale from 'd3-scale';
import * as d3Selection from 'd3-selection';
import * as d3Transition from 'd3-transition';

import type { WindowParameters } from '@kbn/aiops-utils';

import './dual_brush.scss';

const { brush, brushSelection, brushX } = d3Brush;
const { scaleLinear } = d3Scale;
const { select: d3Select } = d3Selection;
// Import fix to apply correct types for the use of d3.select(this).transition()
d3Select.prototype.transition = d3Transition.transition;

const d3 = {
  brush,
  brushSelection,
  brushX,
  scaleLinear,
  select: d3Select,
  transition: d3Transition,
};

const isBrushXSelection = (arg: unknown): arg is [number, number] => {
  return (
    Array.isArray(arg) &&
    arg.length === 2 &&
    typeof arg[0] === 'number' &&
    typeof arg[1] === 'number'
  );
};

interface DualBrush {
  id: string;
  brush: d3Brush.BrushBehavior<DualBrush>;
  start: number;
  end: number;
}

const BRUSH_HEIGHT = 20;
const BRUSH_MARGIN = 4;
const BRUSH_HANDLE_SIZE = 4;
const BRUSH_HANDLE_ROUNDED_CORNER = 2;

interface DualBrushProps {
  windowParameters: WindowParameters;
  min: number;
  max: number;
  onChange?: (windowParameters: WindowParameters) => void;
  marginLeft: number;
  width: number;
}

export function DualBrush({
  windowParameters,
  min,
  max,
  onChange,
  marginLeft,
  width,
}: DualBrushProps) {
  const d3BrushContainer = useRef(null);
  const brushes = useRef<DualBrush[]>([]);
  const widthRef = useRef(width);

  const { baselineMin, baselineMax, deviationMin, deviationMax } = windowParameters;

  useEffect(() => {
    if (d3BrushContainer.current && width > 0) {
      const gBrushes = d3.select(d3BrushContainer.current);

      function newBrush(id: string, start: number, end: number) {
        brushes.current.push({
          id,
          brush: d3.brushX<DualBrush>().handleSize(BRUSH_HANDLE_SIZE).on('end', brushend),
          start,
          end,
        });

        function brushend(this: d3Selection.BaseType) {
          const currentWidth = widthRef.current;

          const x = d3.scaleLinear().domain([min, max]).rangeRound([0, currentWidth]);

          const px2ts = (px: number) => Math.round(x.invert(px));
          const xMin = x(min) ?? 0;
          const xMax = x(max) ?? 0;
          const minExtentPx = Math.round((xMax - xMin) / 100);

          const baselineBrush = d3.select('#brush-baseline');
          const baselineSelection = d3.brushSelection(baselineBrush.node() as SVGGElement);

          const deviationBrush = d3.select('#brush-deviation');
          const deviationSelection = d3.brushSelection(deviationBrush.node() as SVGGElement);

          if (!isBrushXSelection(deviationSelection) || !isBrushXSelection(baselineSelection)) {
            return;
          }

          const baselineOverlay = baselineBrush.selectAll('.overlay');
          const deviationOverlay = deviationBrush.selectAll('.overlay');

          let baselineWidth;
          let deviationWidth;
          baselineOverlay.each((d, i, n) => {
            baselineWidth = d3.select(n[i]).attr('width');
          });
          deviationOverlay.each((d, i, n) => {
            deviationWidth = d3.select(n[i]).attr('width');
          });

          if (baselineWidth !== deviationWidth) {
            return;
          }

          const newWindowParameters = {
            baselineMin: px2ts(baselineSelection[0]),
            baselineMax: px2ts(baselineSelection[1]),
            deviationMin: px2ts(deviationSelection[0]),
            deviationMax: px2ts(deviationSelection[1]),
          };

          if (
            id === 'deviation' &&
            deviationSelection &&
            baselineSelection &&
            deviationSelection[0] - minExtentPx < baselineSelection[1]
          ) {
            const newDeviationMin = baselineSelection[1] + minExtentPx;
            const newDeviationMax = Math.max(deviationSelection[1], newDeviationMin + minExtentPx);

            newWindowParameters.deviationMin = px2ts(newDeviationMin);
            newWindowParameters.deviationMax = px2ts(newDeviationMax);

            d3.select(this)
              .transition()
              .duration(200)
              // @ts-expect-error call doesn't allow the brush move function
              .call(brushes.current[1].brush.move, [newDeviationMin, newDeviationMax]);
          } else if (
            id === 'baseline' &&
            deviationSelection &&
            baselineSelection &&
            deviationSelection[0] < baselineSelection[1] + minExtentPx
          ) {
            const newBaselineMax = deviationSelection[0] - minExtentPx;
            const newBaselineMin = Math.min(baselineSelection[0], newBaselineMax - minExtentPx);

            newWindowParameters.baselineMin = px2ts(newBaselineMin);
            newWindowParameters.baselineMax = px2ts(newBaselineMax);

            d3.select(this)
              .transition()
              .duration(200)
              // @ts-expect-error call doesn't allow the brush move function
              .call(brushes.current[0].brush.move, [newBaselineMin, newBaselineMax]);
          }

          brushes.current[0].start = newWindowParameters.baselineMin;
          brushes.current[0].end = newWindowParameters.baselineMax;
          brushes.current[1].start = newWindowParameters.deviationMin;
          brushes.current[1].end = newWindowParameters.deviationMax;

          if (onChange) {
            onChange(newWindowParameters);
          }
          drawBrushes();
        }
      }

      function drawBrushes() {
        const mlBrushSelection = gBrushes
          .selectAll('.brush')
          .data<DualBrush>(brushes.current, (d) => (d as DualBrush).id);

        // Set up new brushes
        mlBrushSelection
          .enter()
          .insert('g', '.brush')
          .attr('class', 'brush')
          .attr('id', (b: DualBrush) => {
            return 'brush-' + b.id;
          })
          .each((brushObject: DualBrush, i, n) => {
            const x = d3.scaleLinear().domain([min, max]).rangeRound([0, widthRef.current]);
            brushObject.brush(d3.select(n[i]));
            const xStart = x(brushObject.start) ?? 0;
            const xEnd = x(brushObject.end) ?? 0;
            brushObject.brush.move(d3.select(n[i]), [xStart, xEnd]);
          });

        // disable drag-select to reset a brush's selection
        mlBrushSelection
          .attr('class', 'brush')
          .selectAll('.overlay')
          .attr('width', width)
          .style('pointer-events', 'none');

        mlBrushSelection
          .selectAll('.handle')
          .attr('rx', BRUSH_HANDLE_ROUNDED_CORNER)
          .attr('ry', BRUSH_HANDLE_ROUNDED_CORNER);

        mlBrushSelection.exit().remove();
      }

      function updateBrushes() {
        const mlBrushSelection = gBrushes
          .selectAll('.brush')
          .data<DualBrush>(brushes.current, (d) => (d as DualBrush).id);

        mlBrushSelection.each(function (brushObject, i, n) {
          const x = d3.scaleLinear().domain([min, max]).rangeRound([0, widthRef.current]);
          brushObject.brush.extent([
            [0, BRUSH_MARGIN],
            [width, BRUSH_HEIGHT - BRUSH_MARGIN],
          ]);
          brushObject.brush(d3.select(n[i] as SVGGElement));
          const xStart = x(brushObject.start) ?? 0;
          const xEnd = x(brushObject.end) ?? 0;
          brushObject.brush.move(d3.select(n[i] as SVGGElement), [xStart, xEnd]);
        });
      }

      if (brushes.current.length !== 2) {
        widthRef.current = width;
        newBrush('baseline', baselineMin, baselineMax);
        newBrush('deviation', deviationMin, deviationMax);
      } else {
        if (widthRef.current !== width) {
          widthRef.current = width;
          updateBrushes();
        }
      }

      drawBrushes();
    }
  }, [min, max, width, baselineMin, baselineMax, deviationMin, deviationMax, onChange]);

  return (
    <>
      {width > 0 && (
        <svg
          className="aiops-dual-brush"
          width={width}
          height={BRUSH_HEIGHT}
          style={{ marginLeft }}
        >
          <g className="brushes" width={width} ref={d3BrushContainer} />
        </svg>
      )}
    </>
  );
}
