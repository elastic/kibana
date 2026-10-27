/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatValue } from '../../model/format';
import { timeColumn } from '../../model/time';
import type { ChartReading } from '../../render/surfaces';
import { glyph } from '../../theme/glyph';

import { bandIndex, type ResolvedHeatmap, resolveHeatmap } from './model';
import type { HeatmapNode } from './schema';

/** Words the text surfaces print, in one place. */
const copy = {
  xColumn: { category: 'Column', time: 'Time' },
  yColumn: 'Row',
  row: 'Value',
  corner: (y: string, x: string) => `${y}${glyph.axisPair}${x}`,
  noValues: 'No values.',
  highest: (value: string, at: string) => `${at} has the highest value: ${value}.`,
  lowest: (value: string, at: string) => `${at} has the lowest: ${value}.`,
  at: (x: string, y: string) => `${y} at ${x}`,
  topBand: (count: number, total: number, label: string) =>
    `${count} of ${total} cells fall in the top band, ${label}.`,
};

interface Located {
  value: number;
  row: number;
  column: number;
}

/** Every measured value in reading order: rows top to bottom, then columns left to right. */
const measured = ({ values }: ResolvedHeatmap): Located[] =>
  values.flatMap((cells, row) =>
    cells.flatMap((value, column) => (typeof value === 'number' ? [{ value, row, column }] : []))
  );

/** The first in reading order wins a tie. */
const extreme = (items: readonly Located[], sign: 1 | -1): Located =>
  items.reduce((best, item) => (sign * item.value > sign * best.value ? item : best));

const where = ({ x, y }: ResolvedHeatmap, { row, column }: Located): string =>
  y ? copy.at(x[column]!.label, y[row]!.label) : x[column]!.label;

const summary = (node: HeatmapNode, resolved: ResolvedHeatmap): string => {
  const cells = measured(resolved);
  if (cells.length === 0) {
    return copy.noValues;
  }
  const { format } = node;
  const { colorScale } = resolved;
  const top = extreme(cells, 1);
  const sentences = [copy.highest(formatValue(top.value, format), where(resolved, top))];
  if (colorScale.type === 'diverging') {
    const bottom = extreme(cells, -1);
    sentences.push(copy.lowest(formatValue(bottom.value, format), where(resolved, bottom)));
  }
  if (colorScale.type === 'bands' && colorScale.bands.length > 1) {
    const { bands } = colorScale;
    const last = bands.length - 1;
    sentences.push(
      copy.topBand(
        cells.filter(({ value }) => bandIndex(bands, value) === last).length,
        cells.length,
        bands[last]!.label
      )
    );
  }
  return sentences.join(' ');
};

/** The x name, with the time zone its times print in. */
const xName = ({ x }: HeatmapNode, { time }: ResolvedHeatmap): string => {
  const name = x.title ?? copy.xColumn[x.type];
  return time === undefined ? name : timeColumn(name, time.timeZone);
};

/** A matrix in reading order: one row per y, one column per x; a cell left out and a measured gap both print as missing. */
/**
 * The grid as a table with its longer dimension running down the rows, so a wide grid (24 hours by 3 hosts)
 * stays a narrow table every surface can print, Slack's 20-column cap included.
 */
export const read = (node: HeatmapNode): ChartReading => {
  const resolved = resolveHeatmap(node);
  const { x, y, values } = resolved;
  const { format } = node;
  const rowLabels = y?.map(({ label }) => label) ?? [copy.row];
  const yName = node.y?.title ?? copy.yColumn;
  const cell = (value: number | null | undefined) => formatValue(value ?? null, format);
  const table =
    x.length > rowLabels.length
      ? {
          columns: [
            node.y ? copy.corner(xName(node, resolved), yName) : xName(node, resolved),
            ...rowLabels,
          ],
          rows: x.map(({ label }, column) => [
            label,
            ...values.map((cells) => cell(cells[column])),
          ]),
        }
      : {
          columns: [
            node.y ? copy.corner(yName, xName(node, resolved)) : xName(node, resolved),
            ...x.map(({ label }) => label),
          ],
          rows: values.map((cells, row) => [rowLabels[row]!, ...cells.map(cell)]),
        };
  return { summary: summary(node, resolved), table };
};
