/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useEuiTheme } from '@elastic/eui';
import type { Action, CatalogComponent, ComponentRenderProps } from '@kbn/a2ui-renderer';

/** Flat-top hexagon of circumradius 1, centred on the origin. */
const HEX_POINTS = Array.from({ length: 6 }, (_, index) => {
  const angle = (Math.PI / 3) * index;
  return `${Math.cos(angle).toFixed(4)},${Math.sin(angle).toFixed(4)}`;
}).join(' ');

const SQUARE_POINTS = '-0.85,-0.85 0.85,-0.85 0.85,0.85 -0.85,0.85';

/** Column pitch for flat-top hexagons: they interlock at 3/4 of their width. */
const HEX_COLUMN_PITCH = 1.5;
const HEX_ROW_PITCH = Math.sqrt(3);

export interface Cell {
  index: number;
  x: number;
  y: number;
  label: string;
  status: string;
  row: Record<string, unknown>;
}

/**
 * Lays cells out in a fixed number of columns, in cell units. Pure and free of
 * the DOM, which is what lets an SVG `viewBox` do the fitting instead of a
 * `ResizeObserver` — and what makes this testable.
 */
export function layoutCells(
  count: number,
  shape: 'hex' | 'square',
  columns?: number
): {
  columns: number;
  width: number;
  height: number;
  position: (i: number) => { x: number; y: number };
} {
  // A slightly wide aspect reads better than a square block in a panel.
  const cols = Math.max(1, columns ?? Math.ceil(Math.sqrt(Math.max(count, 1)) * 1.3));
  const rows = Math.max(1, Math.ceil(count / cols));

  if (shape === 'square') {
    return {
      columns: cols,
      width: cols * 2,
      height: rows * 2,
      position: (i) => ({ x: (i % cols) * 2 + 1, y: Math.floor(i / cols) * 2 + 1 }),
    };
  }

  return {
    columns: cols,
    width: (cols - 1) * HEX_COLUMN_PITCH + 2,
    // Odd columns are pushed down half a row, so the grid is half a row taller.
    height: rows * HEX_ROW_PITCH + HEX_ROW_PITCH / 2,
    position: (i) => {
      const column = i % cols;
      const row = Math.floor(i / cols);
      return {
        x: column * HEX_COLUMN_PITCH + 1,
        y: row * HEX_ROW_PITCH + (column % 2 === 1 ? HEX_ROW_PITCH : HEX_ROW_PITCH / 2),
      };
    },
  };
}

const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string'
    ? value
    : value === null || value === undefined
    ? fallback
    : String(value);
const num = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

function StatusGridRenderer({
  props,
  rawProps,
  dispatchAction,
  accessibility,
}: ComponentRenderProps) {
  const { euiTheme } = useEuiTheme();
  const [focused, setFocused] = useState(0);

  const shape = props.shape === 'square' ? 'square' : 'hex';
  const labelField = str(props.labelField, 'name');
  const statusField = str(props.statusField, 'status');
  const maxCells = num(props.maxCells, 2000);
  const maxCellSize = num(props.maxCellSize, 34);

  const palette: Record<string, string> = useMemo(
    () => ({
      success: euiTheme.colors.backgroundFilledSuccess,
      danger: euiTheme.colors.backgroundFilledDanger,
      warning: euiTheme.colors.backgroundFilledWarning,
      primary: euiTheme.colors.backgroundFilledPrimary,
      accent: euiTheme.colors.backgroundFilledAccent,
      subdued: euiTheme.colors.backgroundBaseSubdued,
    }),
    [euiTheme]
  );

  const statuses = useMemo(() => {
    const map = new Map<string, { color: string; label: string }>();
    for (const entry of Array.isArray(props.statuses) ? props.statuses : []) {
      if (typeof entry !== 'object' || entry === null) continue;
      const record = entry as Record<string, unknown>;
      const value = str(record.value);
      map.set(value, { color: str(record.color, 'subdued'), label: str(record.label, value) });
    }
    return map;
  }, [props.statuses]);

  // Memoised so the array identity is stable: `setPointer` shares untouched
  // subtrees, so a write elsewhere in the app-wide model leaves this one alone —
  // but only if we do not rebuild it on every render.
  const rows = useMemo(() => (Array.isArray(props.cells) ? props.cells : []), [props.cells]);

  const cells: Cell[] = useMemo(() => {
    const out: Cell[] = [];
    for (let index = 0; index < Math.min(rows.length, maxCells); index++) {
      const row = rows[index];
      if (typeof row !== 'object' || row === null) continue;
      const record = row as Record<string, unknown>;
      out.push({
        index: out.length,
        x: 0,
        y: 0,
        label: str(record[labelField], `Cell ${index + 1}`),
        status: str(record[statusField]),
        row: record,
      });
    }
    return out;
  }, [rows, labelField, statusField, maxCells]);

  const layout = useMemo(
    () => layoutCells(cells.length, shape, props.columns ? num(props.columns, 0) : undefined),
    [cells.length, shape, props.columns]
  );

  const activate = useCallback(
    (index: number) => {
      const action = rawProps.action as Action | undefined;
      const cell = cells[index];
      // `Action` is a union; only the event form carries a context to merge into.
      if (!action || !cell || !('event' in action)) return;
      // Merged as `row`, matching Table.rowActions — the host's `kbn.setData`
      // reads `context.value ?? context.row`, so any other key writes null.
      dispatchAction({
        event: { ...action.event, context: { ...action.event.context, row: cell.row } },
      } as never);
    },
    [cells, rawProps.action, dispatchAction]
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<SVGSVGElement>) => {
      const { columns } = layout;
      const moves: Record<string, number> = {
        ArrowRight: 1,
        ArrowLeft: -1,
        ArrowDown: columns,
        ArrowUp: -columns,
      };
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate(focused);
        return;
      }
      const delta =
        event.key === 'Home' ? -focused : event.key === 'End' ? cells.length : moves[event.key];
      if (delta === undefined) return;
      event.preventDefault();
      setFocused((current) => Math.max(0, Math.min(cells.length - 1, current + delta)));
    },
    [layout, focused, cells.length, activate]
  );

  if (cells.length === 0) return null;

  const counts = new Map<string, number>();
  for (const cell of cells) counts.set(cell.status, (counts.get(cell.status) ?? 0) + 1);
  const summary = [...counts.entries()]
    .map(([status, count]) => `${count} ${statuses.get(status)?.label ?? status}`)
    .join(', ');
  const hidden = rows.length - cells.length;

  return (
    // Fills the panel in both axes, so the grid uses the height it was given
    // rather than overflowing into a second scrollbar. `meet` keeps the cells
    // regular by scaling to whichever axis runs out first, and `maxWidth` stops
    // a handful of cells from inflating into dinner plates in a wide panel.
    // Top-aligned (`YMin`) so any slack falls below the grid rather than
    // splitting into a gap above it.
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        maxWidth: layout.columns * maxCellSize,
      }}
    >
      {/* One <svg> with one <polygon> per cell: 1,000 divs would each carry a
          style object and a layout box, and clip-path would add a compositing
          layer apiece. */}
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMin meet"
        role="grid"
        aria-label={`${accessibility?.label ?? 'Status grid'}: ${cells.length} items — ${summary}${
          hidden > 0 ? `, ${hidden} more not shown` : ''
        }`}
        aria-colcount={layout.columns}
        aria-rowcount={Math.ceil(cells.length / layout.columns)}
        tabIndex={0}
        onKeyDown={onKeyDown}
        // One delegated listener, not one closure per cell.
        onClick={(event) => {
          const index = (event.target as Element).getAttribute?.('data-index');
          if (index !== null && index !== undefined) activate(Number(index));
        }}
        style={{ outline: 'none', display: 'block' }}
      >
        {cells.map((cell) => {
          const { x, y } = layout.position(cell.index);
          const color =
            palette[statuses.get(cell.status)?.color ?? str(props.defaultColor, 'subdued')] ??
            palette.subdued;
          return (
            <g key={cell.index} role="gridcell" aria-label={`${cell.label}, ${cell.status}`}>
              <polygon
                data-index={cell.index}
                points={shape === 'hex' ? HEX_POINTS : SQUARE_POINTS}
                transform={`translate(${x.toFixed(3)} ${y.toFixed(3)}) scale(0.92)`}
                fill={color}
                stroke={cell.index === focused ? euiTheme.colors.primary : 'none'}
                strokeWidth={cell.index === focused ? 0.18 : 0}
                style={{ cursor: rawProps.action ? 'pointer' : 'default' }}
              >
                {/* Native SVG tooltip: 1,000 EuiToolTips would be 1,000
                    stateful components with popover machinery. */}
                <title>{`${cell.label} — ${
                  statuses.get(cell.status)?.label ?? cell.status
                }`}</title>
              </polygon>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export const StatusGrid: CatalogComponent = { name: 'StatusGrid', render: StatusGridRenderer };
