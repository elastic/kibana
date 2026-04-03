/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect, useMemo, useRef } from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { makeHighContrastColor, useEuiTheme } from '@elastic/eui';
import type { PaletteOutput } from '@kbn/coloring';
import type { CustomPaletteState } from '@kbn/charts-plugin/common';
import type { RawValue } from '@kbn/data-plugin/common';
import type { FormatFactory } from '../../../../common/types';
import type { DatatableColumnConfig } from '../../../../common/expressions';
import type { DataContextType } from './types';
import type { CellColorFn } from '../../../shared_components/coloring/get_cell_color_fn';
import {
  buildColumnConfigLookup,
  getRenderMode,
  applyCellColoring,
  isNonColorableValue,
  HtmlCell,
  LinkCell,
  BadgeCell,
} from './cell_value_helpers';

export const createGridCell = (
  formatters: Record<string, ReturnType<FormatFactory>>,
  columnConfig: DatatableColumnConfig,
  DataContext: React.Context<DataContextType>,
  isDarkMode: boolean,
  getCellColor: (
    originalId: string,
    palette?: PaletteOutput<CustomPaletteState>,
    colorMapping?: string
  ) => CellColorFn,
  fitRowToContent?: boolean
) => {
  const columnConfigLookup = buildColumnConfigLookup(columnConfig.columns);

  return ({ rowIndex, columnId, setCellProps, isExpanded }: EuiDataGridCellValueElementProps) => {
    const { table, alignments, handleFilterClick } = useContext(DataContext);
    const { euiTheme } = useEuiTheme();
    const hasColorStyleRef = useRef(false);

    const rawValue: RawValue = table?.rows[rowIndex]?.[columnId];
    const formatter = formatters[columnId];
    const currentColumnConfig = columnConfigLookup.get(columnId);
    const colIndex = currentColumnConfig?.colIndex ?? -1;
    const { oneClickFilter, colorMode = 'none', palette, colorMapping } = currentColumnConfig ?? {};

    const isClickable = Boolean(oneClickFilter && handleFilterClick);
    const isNonColorable = isNonColorableValue(rawValue);
    const renderMode = getRenderMode(colorMode, isClickable, isNonColorable);

    // Badge and link modes need plain text; html mode uses the formatter's html output.
    const contentFormat = renderMode !== 'html' ? 'text' : 'html';
    const fallbackText = rawValue == null ? '' : String(rawValue);
    const content = formatter?.convert(rawValue, contentFormat) ?? fallbackText;

    const alignment = alignments?.get(columnId);

    const onFilter = () => handleFilterClick?.(columnId, rawValue, colIndex, rowIndex);

    const cellStyle = useMemo(
      () =>
        applyCellColoring({
          colorMode,
          columnId,
          palette,
          colorMapping,
          rawValue,
          getCellColor,
          isDarkMode,
        }),
      [colorMode, columnId, palette, colorMapping, rawValue]
    );

    const badgeColor = useMemo(() => {
      if (renderMode !== 'badge' || (!palette && !colorMapping)) return null;
      if (isNonColorableValue(rawValue)) return null;
      const color = getCellColor(columnId, palette, colorMapping)(rawValue);
      return color || null;
    }, [renderMode, columnId, palette, colorMapping, rawValue]);

    useEffect(() => {
      // Cell/text coloring is applied via setCellProps (affects the EuiDataGrid cell container).
      // Badge mode handles its own color inline; none means no coloring.
      if (!cellStyle) {
        // EuiDataGrid virtualizes/reuses cells, so ensure we clear any previously applied styles
        // when this cell should not be colored (e.g. null/blank/NaN, or coloring disabled).
        if (hasColorStyleRef.current) {
          setCellProps({ style: { backgroundColor: undefined, color: undefined } });
          hasColorStyleRef.current = false;
        }
        return;
      }

      setCellProps({ style: cellStyle });
      hasColorStyleRef.current = true;

      // Clean up styles when dependencies change to avoid stale colors sticking.
      // Skip cleanup when the cell is expanded — it would clear the expanded panel's style.
      if (!isExpanded) {
        return () => {
          setCellProps({ style: { backgroundColor: undefined, color: undefined } });
          hasColorStyleRef.current = false;
        };
      }
    }, [cellStyle, setCellProps, isExpanded]);

    switch (renderMode) {
      case 'badge':
        return (
          <BadgeCell
            label={content}
            badgeColor={badgeColor}
            isClickable={isClickable}
            onClick={onFilter}
            isDarkMode={isDarkMode}
            alignment={alignment}
            fitRowToContent={fitRowToContent}
          />
        );

      case 'link': {
        const backgroundColor =
          colorMode === 'cell' && !isNonColorableValue(rawValue)
            ? getCellColor(columnId, palette, colorMapping)(rawValue)
            : null;
        const baseColor = euiTheme.colors.link;
        // Only adjust link contrast when the cell background is colored (colorMode: cell).
        const linkColor =
          colorMode === 'cell' && backgroundColor
            ? makeHighContrastColor(
                isDarkMode ? euiTheme.colors.highlight : baseColor, // preferred foreground
                4.5 // WCAG AA contrast ratio (default in EUI)
              )(backgroundColor)
            : baseColor;

        return (
          <LinkCell
            content={content}
            linkColor={linkColor}
            onClick={onFilter}
            alignment={alignment}
            fitRowToContent={fitRowToContent}
          />
        );
      }

      case 'html':
      default:
        return (
          <HtmlCell
            content={content}
            alignment={alignment}
            fitRowToContent={fitRowToContent}
            isColored={Boolean(cellStyle)}
          />
        );
    }
  };
};
