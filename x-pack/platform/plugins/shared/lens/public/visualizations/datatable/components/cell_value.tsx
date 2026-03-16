/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect, useMemo } from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { makeHighContrastColor } from '@elastic/eui';
import { EuiLink, EuiProgress, useEuiTheme } from '@elastic/eui';
import classNames from 'classnames';
import { getOriginalId } from '@kbn/transpose-utils';
import type { PaletteOutput } from '@kbn/coloring';
import type { CustomPaletteState } from '@kbn/charts-plugin/common';
import type { RawValue } from '@kbn/data-plugin/common';
import type { FormatFactory } from '../../../../common/types';
import type { DatatableColumnConfig } from '../../../../common/expressions';
import type { DataContextType } from './types';
import { getContrastColor } from '../../../shared_components/coloring/utils';
import type { CellColorFn } from '../../../shared_components/coloring/get_cell_color_fn';

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
  return ({ rowIndex, columnId, setCellProps, isExpanded }: EuiDataGridCellValueElementProps) => {
    const {
      table,
      alignments,
      handleFilterClick,
      minMaxByColumnId,
      maxValueLengthByColumnId,
      progressBarGradientByColumnId,
    } = useContext(DataContext);
    const formatter = formatters[columnId];
    const rawValue: RawValue = table?.rows[rowIndex]?.[columnId];
    const colIndex = columnConfig.columns.findIndex(({ columnId: id }) => id === columnId);
    const { euiTheme } = useEuiTheme();
    const {
      oneClickFilter,
      colorMode = 'none',
      palette,
      colorMapping,
      showProgressBar = false,
      progressBarColorMode = 'classic',
      progressBarMaxMode = 'highest',
      progressBarMaxValue,
      progressBarColor: progressBarColorOverride,
    } = columnConfig.columns[colIndex] ?? {};
    const filterOnClick = oneClickFilter && handleFilterClick;
    const content = formatter?.convert(rawValue, filterOnClick ? 'text' : 'html');
    const currentAlignment = alignments?.get(columnId);

    const progressBarMax = useMemo(() => {
      if (!showProgressBar) return 1;
      if (progressBarMaxMode === 'custom' && progressBarMaxValue != null && !Number.isNaN(progressBarMaxValue) && progressBarMaxValue > 0) {
        return progressBarMaxValue;
      }
      if (!table?.rows?.length) return 1;
      const originalId = getOriginalId(columnId);
      const fromMinMax = minMaxByColumnId?.get(originalId)?.max;
      if (fromMinMax != null && !Number.isNaN(fromMinMax)) return fromMinMax;
      const values = table.rows
        .map((row) => Number(row[columnId]))
        .filter((n) => !Number.isNaN(n));
      return values.length > 0 ? Math.max(...values) : 1;
    }, [showProgressBar, progressBarMaxMode, progressBarMaxValue, table?.rows, columnId, minMaxByColumnId]);

    const progressBarValue = useMemo(() => {
      const n = Number(rawValue);
      return Number.isNaN(n) ? 0 : n;
    }, [rawValue]);

    useEffect(() => {
      let colorSet = false;
      // When colorMode is 'text' and progress bar is shown, we color the bar instead of the text — skip cell text color
      const skipTextColor = colorMode === 'text' && showProgressBar;
      if (colorMode !== 'none' && !skipTextColor && (palette || colorMapping)) {
        const color = getCellColor(columnId, palette, colorMapping)(rawValue);

        if (color) {
          const style = { [colorMode === 'cell' ? 'backgroundColor' : 'color']: color };
          if (colorMode === 'cell' && color) {
            style.color = getContrastColor(color, isDarkMode);
          }
          colorSet = true;
          setCellProps({ style });
        }
      }

      // Clean up styles when something changes, this avoids cell's styling to stick forever
      // Checks isExpanded to prevent clearing style after expanding cell
      if (colorSet && !isExpanded) {
        return () => {
          setCellProps({
            style: {
              backgroundColor: undefined,
              color: undefined,
            },
          });
        };
      }
    }, [rawValue, columnId, setCellProps, colorMode, palette, colorMapping, isExpanded, showProgressBar]);

    if (filterOnClick) {
      const backgroundColor = getCellColor(columnId, palette, colorMapping)(rawValue);
      const linkColor = euiTheme.colors.link;

      // Only adjust the color for colorMode: cell
      const adjustedLinkColor =
        colorMode === 'cell' && backgroundColor
          ? makeHighContrastColor(
              isDarkMode ? euiTheme.colors.highlight : linkColor, // preferred foreground color
              4.5 // WCAG AA contrast ratio (default in EUI)
            )(backgroundColor)
          : linkColor;

      return (
        <div
          data-test-subj="lnsTableCellContent"
          className={classNames({
            'lnsTableCell--multiline': fitRowToContent,
            [`lnsTableCell--${currentAlignment}`]: true,
          })}
        >
          <EuiLink
            style={{ color: adjustedLinkColor }}
            onClick={() => {
              handleFilterClick?.(columnId, rawValue, colIndex, rowIndex);
            }}
          >
            {content}
          </EuiLink>
        </div>
      );
    }

    const showProgressBarBlock = showProgressBar;
    if (showProgressBarBlock) {
      // When progress bar is shown: Left = text left of bar, Right = text right of bar (center treated as left)
      // Bar color: single = progressBarColorOverride, solid = color mapping, gradient = gradient from context
      const isTextRight = currentAlignment === 'right';
      const justifyContent =
        currentAlignment === 'right'
          ? 'flex-end'
          : currentAlignment === 'center'
            ? 'center'
            : 'flex-start';
      const valueLength = maxValueLengthByColumnId?.get(columnId);
      const valueStyle: React.CSSProperties = valueLength
        ? { minWidth: `${valueLength}ch`, flexShrink: 0 }
        : {};
      const valueNode = (
        <div
          dangerouslySetInnerHTML={{ __html: content }} // eslint-disable-line react/no-danger
          className={classNames('lnsTableCell__value')}
          style={valueStyle}
        />
      );
      const useGradient = progressBarColorMode === 'gradient';
      const progressBarColorFromPalette =
        progressBarColorMode === 'solid' && (palette || colorMapping)
          ? getCellColor(columnId, palette, colorMapping)(rawValue)
          : undefined;
      const progressBarDisplayColor =
        progressBarColorMode === 'single' && progressBarColorOverride
          ? progressBarColorOverride
          : progressBarColorMode === 'solid' && progressBarColorFromPalette
            ? progressBarColorFromPalette
            : 'vis0';
      const progressBarStyle = {
        minWidth: 40,
        maxWidth: '100%',
        flex: 1,
        ...(progressBarDisplayColor !== 'vis0' ? { color: progressBarDisplayColor } : {}),
      };
      const gradientCss =
        progressBarGradientByColumnId?.get(columnId) ??
        'linear-gradient(to right, red, blue)';
      const progressScale =
        progressBarMax > 0 ? progressBarValue / progressBarMax : 0;
      const progressNode = useGradient ? (
        <div
          role="progressbar"
          aria-valuenow={progressBarValue}
          aria-valuemin={0}
          aria-valuemax={progressBarMax}
          data-test-subj="lnsDatatableProgressBar"
          style={{
            minWidth: 40,
            maxWidth: '100%',
            flex: 1,
            width: '100%',
            height: euiTheme.size.m,
            borderRadius: 20,
            backgroundColor: euiTheme.colors.lightShade,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progressScale * 100}%`,
              height: '100%',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: progressScale > 0 ? `${100 / progressScale}%` : 0,
                height: '100%',
                minWidth: progressScale > 0 ? '100%' : 0,
                background: gradientCss,
                borderRadius: euiTheme.border.radius.small,
              }}
            />
          </div>
        </div>
      ) : (
        <EuiProgress
          value={progressBarValue}
          max={progressBarMax}
          size="xl"
          color={progressBarDisplayColor}
          data-test-subj="lnsDatatableProgressBar"
          style={progressBarStyle}
        />
      );
      return (
        <div
          data-test-subj="lnsTableCellContent"
          className={classNames({
            'lnsTableCell--multiline': fitRowToContent,
          })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            justifyContent,
          }}
        >
          {isTextRight ? progressNode : valueNode}
          {isTextRight ? valueNode : progressNode}
        </div>
      );
    }

    return (
      <div
        /*
         * dangerouslySetInnerHTML is necessary because the field formatter might produce HTML markup
         * which is produced in a safe way.
         */
        dangerouslySetInnerHTML={{ __html: content }} // eslint-disable-line react/no-danger
        data-test-subj="lnsTableCellContent"
        className={classNames({
          'lnsTableCell--multiline': fitRowToContent,
          'lnsTableCell--colored': colorMode !== 'none',
          [`lnsTableCell--${currentAlignment}`]: true,
        })}
      />
    );
  };
};
