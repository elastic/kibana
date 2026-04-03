/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { DatatableState, LegacyMetricState, RegionMapState, EsqlData } from '../types';
import { colName, colLabel } from './data_utils';
import { isDarkMode } from './chart_theme';

interface TableRendererProps {
  spec: DatatableState | LegacyMetricState | RegionMapState;
  data: EsqlData;
}

/**
 * Resolves which columns to display in the table.
 *
 * For data_table specs, uses the explicit metrics/rows columns if provided.
 * For legacy_metric and region_map, shows all available columns.
 */
const resolveDisplayColumns = (
  spec: DatatableState | LegacyMetricState | RegionMapState,
  data: EsqlData
): Array<{ name: string; label: string }> => {
  if (spec.type === 'data_table') {
    const cols: Array<{ name: string; label: string }> = [];
    if (spec.rows) {
      for (const c of spec.rows) {
        cols.push({ name: colName(c), label: colLabel(c) });
      }
    }
    if (spec.metrics) {
      for (const c of spec.metrics) {
        cols.push({ name: colName(c), label: colLabel(c) });
      }
    }
    // If nothing explicit, show all columns
    if (cols.length === 0) {
      return data.columns.map((c) => ({ name: c.name, label: c.name }));
    }
    return cols;
  }

  // Fallback for legacy_metric, region_map
  return data.columns.map((c) => ({ name: c.name, label: c.name }));
};

const cellStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderBottom: `1px solid ${isDarkMode ? '#333' : '#e0e0e0'}`,
  textAlign: 'left',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: 300,
};

const headerStyle: React.CSSProperties = {
  ...cellStyle,
  fontWeight: 600,
  position: 'sticky',
  top: 0,
  background: isDarkMode ? '#1a1a1a' : '#f5f5f5',
};

export const TableRenderer: React.FC<TableRendererProps> = ({ spec, data }) => {
  const displayCols = resolveDisplayColumns(spec, data);
  const colIndices = displayCols.map((dc) => data.columns.findIndex((c) => c.name === dc.name));

  return (
    <div style={{ overflow: 'auto', maxHeight: 400 }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.85rem',
        }}
      >
        <thead>
          <tr>
            {displayCols.map((col, i) => (
              <th key={i} style={headerStyle}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.values.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {colIndices.map((colIdx, cellIdx) => (
                <td key={cellIdx} style={cellStyle}>
                  {colIdx >= 0 ? String(row[colIdx] ?? '') : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
