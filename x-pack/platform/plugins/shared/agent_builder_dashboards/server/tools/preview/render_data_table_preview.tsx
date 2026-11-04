/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IconChartDatatable } from '@kbn/chart-icons';
import { euiThemeVars } from '@kbn/ui-theme';
import { PREVIEW_WIDTH, escapeXml, framePreviewSvg } from './preview_frame';
import { measurePreviewText, previewTextSvg } from './preview_font';
import { emptyPlaceholderSvg, euiIconSvg } from './preview_icons';
import { getDataSourceQuery } from './preview_table';
import type { PanelPreviewRenderer, PreviewContext, PreviewTable } from './types';
import { getContrastTextColor, getLinkColor } from './render_data_table_color';
import {
  buildDataTableModel,
  isEmptyValue,
  isMissingValue,
  parseDataTableConfig,
  type Alignment,
  type DataTablePanelConfig,
  type GridColumn,
} from './render_data_table_model';

// EUI DataGrid in the Borealis light theme, with the grid style Lens sets: horizontal borders,
// shaded header and footer, and the density's font size, line height and cell padding.
const TEXT_COLOR = euiThemeVars.euiTextColor;
const EMPTY_VALUE_COLOR = euiThemeVars.euiColorDarkShade;
const ROW_NUMBER_COLOR = euiThemeVars.euiColorDarkShade;
const SUBDUED_COLOR = euiThemeVars.euiTextSubduedColor;
const DISABLED_COLOR = euiThemeVars.euiColorDisabledText;
const PRIMARY_COLOR = euiThemeVars.euiColorPrimary;
const BORDER_COLOR = euiThemeVars.euiBorderColor;
const SHADE_COLOR = euiThemeVars.euiColorLightestShade;
const HOLLOW_BADGE_COLOR = euiThemeVars.euiColorEmptyShade;
const HOLLOW_BADGE_BORDER = euiThemeVars.euiColorLightShade;
const DENSITIES = {
  compact: { fontSize: 12, lineHeight: 16, padding: 4 },
  default: { fontSize: 14, lineHeight: 24, padding: 6 },
  expanded: { fontSize: 14, lineHeight: 24, padding: 8 },
};
const DEFAULT_HEADER_LINES = 3;
const AUTO_HEIGHT_MAX_LINES = 10;
const GRID_X = 8;
const GRID_WIDTH = PREVIEW_WIDTH - 2 * GRID_X;
const MIN_COLUMN_WIDTH = 100;
const ROW_NUMBER_WIDTH = 50;
const ROW_NUMBER_CONTENT_WIDTH = 38;
const ICON_SIZE = 16;
// `EuiBadge`: 12px medium text on a 14px line, 1px border, 8px inline padding.
const BADGE = { fontSize: 12, weight: 500, lineHeight: 14, padding: 8, height: 16 };
// `EuiDataGridPagination`: 4px top padding, `EuiTablePagination` with an xs "Rows per page"
// button and an `EuiPagination` of size s page buttons and xs arrow buttons.
const PAGINATION = {
  paddingTop: 4,
  height: 32,
  pageSizeOptions: [10, 20, 30, 50, 100],
  maxVisiblePages: 5,
};
const NOTE_HEIGHT = 24;
const BOTTOM_MARGIN = 8;
// Taller tables are cut, and a note says how many rows are not shown.
const MAX_CHART_HEIGHT = 480;
const EMPTY_HEIGHT = 200;
const ELLIPSIS = '…';
// Inter's ascender and descender, as a share of the font size.
const ASCENT = 2728 / 2816;
const DESCENT = 680 / 2816;

interface TextStyle {
  fontSize: number;
  weight?: number;
}

const cssFont = ({ fontSize, weight = 400 }: TextStyle) => `${weight} ${fontSize}px Inter`;

const measure = (text: string, style: TextStyle) => measurePreviewText(text, cssFont(style));

const textSvg = (
  text: string,
  x: number,
  y: number,
  style: TextStyle,
  fill: string,
  anchor: 'start' | 'middle' | 'end' = 'start'
) => previewTextSvg(text, { font: cssFont(style), x, y, fill, anchor });

// The baseline that centers a line of Inter vertically in a line box, as CSS does.
const baselineY = (top: number, lineHeight: number, fontSize: number) =>
  top + lineHeight / 2 + ((ASCENT - DESCENT) / 2) * fontSize;

const truncate = (text: string, width: number, style: TextStyle): string => {
  if (measure(text, style) <= width) return text;
  const chars = [...text];
  while (chars.length && measure(chars.join('') + ELLIPSIS, style) > width) chars.pop();
  return chars.length ? chars.join('') + ELLIPSIS : '';
};

// Wraps text on spaces (and inside words that do not fit) like `white-space: normal`, and ends the
// last allowed line with an ellipsis like `-webkit-line-clamp`.
const wrapText = (text: string, width: number, style: TextStyle, maxLines: number): string[] => {
  if (maxLines <= 1) return [truncate(text, width, style)];
  const lines: string[] = [];
  let line = '';
  const pushWord = (word: string) => {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate, style) <= width) {
      line = candidate;
      return;
    }
    if (line) lines.push(line);
    line = '';
    let rest = [...word];
    while (rest.length && measure(rest.join(''), style) > width) {
      let fit = rest.length - 1;
      while (fit > 1 && measure(rest.slice(0, fit).join(''), style) > width) fit--;
      lines.push(rest.slice(0, fit).join(''));
      rest = rest.slice(fit);
    }
    line = rest.join('');
  };
  text.split(/\s+/).filter(Boolean).forEach(pushWord);
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = truncate(`${kept[maxLines - 1]}${ELLIPSIS}`, width, style);
  return kept;
};

const ANCHORS = { left: 'start', center: 'middle', right: 'end' } as const;
const getAnchorX = (alignment: Alignment, x: number, width: number, padding: number) =>
  alignment === 'left' ? x + padding : alignment === 'right' ? x + width - padding : x + width / 2;

// EUI DataGrid gives columns their configured width and shares the rest equally, at least
// 100px each, scrolling horizontally when they do not fit.
const getColumnWidths = (columns: GridColumn[], available: number) => {
  const fixedWidth = columns.reduce((sum, { width }) => sum + (width ?? 0), 0);
  const unsized = columns.filter(({ width }) => width === undefined).length;
  const shared = unsized ? Math.max((available - fixedWidth) / unsized, MIN_COLUMN_WIDTH) : 0;
  return columns.map(({ width }) => width ?? shared);
};

const rect = (x: number, y: number, width: number, height: number, fill: string, extra = '') =>
  `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${width.toFixed(
    1
  )}" height="${height.toFixed(1)}" fill="${escapeXml(fill)}"${extra}/>`;

// The page links `EuiPagination` shows: at most five pages around the active one, plus the
// first and last page, with an ellipsis for skipped pages.
const getPageItems = (pageCount: number, activePage: number): Array<number | 'ellipsis'> => {
  const surrounding = Math.floor(PAGINATION.maxVisiblePages / 2);
  const first = Math.max(
    0,
    Math.min(activePage - surrounding, pageCount - PAGINATION.maxVisiblePages)
  );
  const last = Math.min(pageCount, first + PAGINATION.maxVisiblePages);
  const pages: Array<number | 'ellipsis'> = Array.from(
    { length: last - first },
    (_, index) => first + index
  );
  const before: Array<number | 'ellipsis'> =
    first === 0 ? [] : first === 2 ? [0, 1] : first > 1 ? [0, 'ellipsis'] : [0];
  const after: Array<number | 'ellipsis'> =
    last >= pageCount
      ? []
      : last + 1 === pageCount - 1
      ? [last, pageCount - 1]
      : last < pageCount - 1
      ? ['ellipsis', pageCount - 1]
      : [pageCount - 1];
  return [...before, ...pages, ...after];
};

// The pagination bar under the grid, on its first page: "Rows per page" on the left, the page
// links between previous and next arrows on the right.
const renderPaginationSvg = async (top: number, pageSize: number, pageCount: number) => {
  const centerY = top + PAGINATION.paddingTop + PAGINATION.height / 2;
  const parts: string[] = [];

  const pageSizeStyle = { fontSize: 12, weight: 500 };
  const pageSizeLabel = `Rows per page: ${pageSize}`;
  const pageSizeX = GRID_X + 6;
  parts.push(
    textSvg(pageSizeLabel, pageSizeX, baselineY(centerY - 8, 16, 12), pageSizeStyle, TEXT_COLOR),
    await euiIconSvg('chevronSingleDown', {
      size: 12,
      color: TEXT_COLOR,
      x: pageSizeX + measure(pageSizeLabel, pageSizeStyle) + 4,
      y: centerY - 6,
    })
  );

  const pageStyle = { fontSize: 14, weight: 500 };
  const activeStyle = { fontSize: 14, weight: 600 };
  const items = getPageItems(pageCount, 0).map((item) => {
    const label = item === 'ellipsis' ? ELLIPSIS : String(item + 1);
    const isActive = item === 0;
    return {
      label,
      isActive,
      isEllipsis: item === 'ellipsis',
      width: measure(label, isActive ? activeStyle : pageStyle) + 16,
    };
  });
  const arrowWidth = 24;
  let x = GRID_X + GRID_WIDTH - 2 * arrowWidth - items.reduce((sum, { width }) => sum + width, 0);
  parts.push(
    await euiIconSvg('chevronSingleLeft', {
      size: ICON_SIZE,
      color: DISABLED_COLOR,
      x: x + (arrowWidth - ICON_SIZE) / 2,
      y: centerY - ICON_SIZE / 2,
    })
  );
  x += arrowWidth;
  items.forEach(({ label, isActive, isEllipsis, width }) => {
    const style = isActive ? activeStyle : pageStyle;
    const baseline = baselineY(centerY - 10, 20, 14);
    const color = isEllipsis ? DISABLED_COLOR : isActive ? PRIMARY_COLOR : TEXT_COLOR;
    parts.push(textSvg(label, x + width / 2, baseline, style, color, 'middle'));
    if (isActive) {
      // The active page is underlined.
      const textWidth = measure(label, style);
      parts.push(rect(x + (width - textWidth) / 2, baseline + 1.5, textWidth, 1, PRIMARY_COLOR));
    }
    x += width;
  });
  parts.push(
    await euiIconSvg('chevronSingleRight', {
      size: ICON_SIZE,
      color: pageCount > 1 ? TEXT_COLOR : DISABLED_COLOR,
      x: x + (arrowWidth - ICON_SIZE) / 2,
      y: centerY - ICON_SIZE / 2,
    })
  );
  return parts.join('');
};

interface DrawnRow {
  values: unknown[];
  lines: string[][];
  height: number;
}

/**
 * Draws a Lens data table (ES|QL) as an SVG grid like the EUI DataGrid Lens renders: row columns
 * then (pivoted) metric columns, labels, value formats, dates in the Kibana time zone, alignment,
 * cell colors (text, background or badge), one-click filter links, density, header and row
 * heights, row numbers, the sort arrow, the summary row, and the first page with the pagination
 * bar when paging is on. Rows past the height cap are cut and counted in a note.
 */
const renderDataTablePreviewSvg = async (
  panelConfig: DataTablePanelConfig,
  table: PreviewTable,
  context: PreviewContext
): Promise<string> => {
  const config = parseDataTableConfig(panelConfig);
  const { columns, rows, sort } = buildDataTableModel(config, table, context);
  if (!rows.length || !columns.length) {
    return framePreviewSvg(
      config.title,
      emptyPlaceholderSvg({ icon: IconChartDatatable, width: PREVIEW_WIDTH, height: EMPTY_HEIGHT }),
      EMPTY_HEIGHT
    );
  }

  const { styling } = config;
  const { fontSize, lineHeight, padding } = DENSITIES[styling?.density?.mode ?? 'default'];
  const cellStyle = { fontSize };
  const headerStyle = { fontSize, weight: 600 };
  const headerHeightConfig = styling?.density?.height?.header;
  const valueHeightConfig = styling?.density?.height?.value;
  const headerMaxLines =
    headerHeightConfig?.type === 'auto'
      ? AUTO_HEIGHT_MAX_LINES
      : headerHeightConfig?.max_lines ?? DEFAULT_HEADER_LINES;
  const isAutoRowHeight = valueHeightConfig?.type === 'auto';
  const rowLines = isAutoRowHeight
    ? AUTO_HEIGHT_MAX_LINES
    : valueHeightConfig?.type === 'custom'
    ? valueHeightConfig.lines
    : 1;
  const showRowNumbers = styling?.row_numbers?.visible === true;
  const sortedColumn = sort ? columns[sort.columnIndex] : undefined;

  const leadingWidth = showRowNumbers ? ROW_NUMBER_WIDTH : 0;
  const widths = getColumnWidths(columns, GRID_WIDTH - leadingWidth);
  const lefts = widths.map(
    (_, index) => GRID_X + leadingWidth + widths.slice(0, index).reduce((a, b) => a + b, 0)
  );
  const gridRight = GRID_X + GRID_WIDTH;
  const shownColumns = columns.filter((_, index) => lefts[index] < gridRight);
  const hiddenColumnCount = columns.length - shownColumns.length;

  // Header: names wrap up to the header line limit; the tallest one sets the header height. The
  // sort arrow sits after the name, at the end of the cell.
  const headerLines = shownColumns.map((column, index) => {
    const arrowWidth = column === sortedColumn ? ICON_SIZE : 0;
    return wrapText(
      column.name,
      widths[index] - 2 * padding - arrowWidth,
      headerStyle,
      headerMaxLines
    );
  });
  const headerHeight =
    Math.max(...headerLines.map((lines) => lines.length)) * lineHeight + 2 * padding;

  // Cells: one line by default, wrapped to the row height when it has more lines. Badges and
  // missing values take one line.
  const getCellText = (column: GridColumn, value: unknown) =>
    isMissingValue(value) ? '-' : column.formatCell(value);
  const isBadge = (column: GridColumn, value: unknown) =>
    column.colorMode === 'badge' && !isEmptyValue(value);
  const getCellLines = (values: unknown[]) =>
    shownColumns.map((column, index) => {
      const width = widths[index] - 2 * padding;
      // Badges show the text format, which lists a multi-value as JSON.
      return isBadge(column, values[index])
        ? [truncate(column.formatText(values[index]), width - 2 * BADGE.padding, BADGE)]
        : wrapText(getCellText(column, values[index]), width, cellStyle, rowLines);
    });
  const getRowHeight = (cellLines: string[][]) =>
    (isAutoRowHeight ? Math.max(...cellLines.map((lines) => lines.length)) : rowLines) *
      lineHeight +
    2 * padding;

  // EUI hides the pagination bar when there are fewer rows than the smallest page size.
  const pageSize = styling?.paging;
  const showPagination = pageSize !== undefined && rows.length >= PAGINATION.pageSizeOptions[0];
  const pageRows = pageSize ? rows.slice(0, pageSize) : rows;
  const pageCount = pageSize ? Math.ceil(rows.length / pageSize) : 1;
  const summaries = shownColumns.map(({ summary }) => summary);
  const hasSummary = summaries.some((summary) => summary !== undefined);
  const summaryHeight = hasSummary ? lineHeight + 2 * padding : 0;
  const paginationHeight = showPagination ? PAGINATION.paddingTop + PAGINATION.height : 0;
  const reserved = headerHeight + summaryHeight + paginationHeight + NOTE_HEIGHT + BOTTOM_MARGIN;

  const drawnRows: DrawnRow[] = [];
  let bodyHeight = 0;
  for (const values of pageRows) {
    const lines = getCellLines(values);
    const height = getRowHeight(lines);
    if (drawnRows.length && reserved + bodyHeight + height > MAX_CHART_HEIGHT) break;
    drawnRows.push({ values, lines, height });
    bodyHeight += height;
  }
  const hiddenRowCount = pageRows.length - drawnRows.length;
  const notes = [
    ...(hiddenRowCount ? [`${hiddenRowCount} more rows not shown`] : []),
    ...(hiddenColumnCount ? [`${hiddenColumnCount} more columns not shown`] : []),
  ];

  const parts: string[] = [];
  const clipToColumn = (index: number, content: string) =>
    `<g clip-path="url(#data-table-column-${index})">${content}</g>`;
  const hLine = (y: number) => rect(GRID_X, y, GRID_WIDTH, 1, BORDER_COLOR);

  // Header row.
  parts.push(rect(GRID_X, 0, GRID_WIDTH, headerHeight, SHADE_COLOR));
  for (const [index, column] of shownColumns.entries()) {
    const left = lefts[index];
    const isSorted = column === sortedColumn && sort;
    const textWidth = isSorted ? widths[index] - ICON_SIZE : widths[index];
    const x = getAnchorX(column.alignment, left, textWidth, padding);
    const lines = headerLines[index];
    const textTop = (headerHeight - lines.length * lineHeight) / 2;
    if (isSorted) {
      parts.push(
        await euiIconSvg(sort.direction === 'asc' ? 'sortUp' : 'sortDown', {
          size: ICON_SIZE,
          color: TEXT_COLOR,
          x: left + widths[index] - padding - ICON_SIZE,
          y: headerHeight / 2 - ICON_SIZE / 2,
        })
      );
    }
    lines.forEach((line, lineIndex) => {
      parts.push(
        clipToColumn(
          index,
          textSvg(
            line,
            x,
            baselineY(textTop + lineIndex * lineHeight, lineHeight, fontSize),
            headerStyle,
            TEXT_COLOR,
            ANCHORS[column.alignment]
          )
        )
      );
    });
  }
  parts.push(hLine(0), hLine(headerHeight - 1));

  // Body rows.
  let top = headerHeight;
  drawnRows.forEach(({ values, lines, height }, rowIndex) => {
    if (showRowNumbers) {
      parts.push(
        textSvg(
          String(rowIndex + 1),
          GRID_X + padding + ROW_NUMBER_CONTENT_WIDTH / 2,
          baselineY(top + padding, lineHeight, 12),
          { fontSize: 12 },
          ROW_NUMBER_COLOR,
          'middle'
        )
      );
    }
    shownColumns.forEach((column, index) => {
      const value = values[index];
      const left = lefts[index];
      const width = widths[index];
      const isEmpty = isEmptyValue(value);
      const color = isEmpty ? undefined : column.getColor?.(value);
      const { colorMode } = column;
      const cellBackground = color && colorMode === 'cell' ? color : undefined;
      if (cellBackground) parts.push(rect(left, top, width, height - 1, cellBackground));

      if (isBadge(column, value)) {
        const [label] = lines[index];
        const badgeWidth = Math.min(measure(label, BADGE) + 2 * BADGE.padding, width - 2 * padding);
        const badgeX =
          column.alignment === 'left'
            ? left + padding
            : column.alignment === 'right'
            ? left + width - padding - badgeWidth
            : left + (width - badgeWidth) / 2;
        const badgeY = top + padding + (lineHeight - BADGE.height) / 2;
        const badgeColor = color ?? HOLLOW_BADGE_COLOR;
        parts.push(
          rect(
            badgeX,
            badgeY,
            badgeWidth,
            BADGE.height,
            badgeColor,
            ` rx="${BADGE.height / 2}"${color ? '' : ` stroke="${HOLLOW_BADGE_BORDER}"`}`
          ),
          textSvg(
            label,
            badgeX + BADGE.padding,
            baselineY(badgeY + 1, BADGE.lineHeight, BADGE.fontSize),
            BADGE,
            getContrastTextColor(badgeColor)
          )
        );
        return;
      }

      let textColor = TEXT_COLOR;
      if (isEmpty) textColor = EMPTY_VALUE_COLOR;
      else if (column.isLink) textColor = getLinkColor(cellBackground);
      else if (cellBackground) textColor = getContrastTextColor(cellBackground);
      else if (color && colorMode === 'text') textColor = color;
      const x = getAnchorX(column.alignment, left, width, padding);
      lines[index].forEach((line, lineIndex) => {
        parts.push(
          clipToColumn(
            index,
            textSvg(
              line,
              x,
              baselineY(top + padding + lineIndex * lineHeight, lineHeight, fontSize),
              cellStyle,
              textColor,
              ANCHORS[column.alignment]
            )
          )
        );
      });
    });
    top += height;
    parts.push(hLine(top - 1));
  });

  // Summary row (EUI footer): shaded, bold, under the last drawn row.
  if (hasSummary) {
    parts.push(rect(GRID_X, top, GRID_WIDTH, summaryHeight, SHADE_COLOR));
    summaries.forEach((summary, index) => {
      if (summary === undefined) return;
      const column = shownColumns[index];
      parts.push(
        clipToColumn(
          index,
          textSvg(
            truncate(summary, widths[index] - 2 * padding, headerStyle),
            getAnchorX(column.alignment, lefts[index], widths[index], padding),
            baselineY(top + padding, lineHeight, fontSize),
            headerStyle,
            TEXT_COLOR,
            ANCHORS[column.alignment]
          )
        )
      );
    });
    top += summaryHeight;
    parts.push(hLine(top - 1));
  }

  if (showPagination && pageSize) {
    parts.push(await renderPaginationSvg(top, pageSize, pageCount));
    top += paginationHeight;
  }

  if (notes.length) {
    parts.push(
      textSvg(notes.join(', '), GRID_X, baselineY(top + 4, 16, 12), { fontSize: 12 }, SUBDUED_COLOR)
    );
    top += NOTE_HEIGHT;
  }

  const height = Math.ceil(top + BOTTOM_MARGIN);
  return framePreviewSvg(
    config.title,
    [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${PREVIEW_WIDTH}" height="${height}">`,
      '<defs>',
      `<clipPath id="data-table-grid"><rect x="${GRID_X}" y="0" width="${GRID_WIDTH}" height="${height}"/></clipPath>`,
      ...shownColumns.map(
        (_, index) =>
          `<clipPath id="data-table-column-${index}"><rect x="${lefts[index]}" y="0" width="${widths[index]}" height="${height}"/></clipPath>`
      ),
      '</defs>',
      `<g clip-path="url(#data-table-grid)">${parts.join('')}</g>`,
      '</svg>',
    ].join(''),
    height
  );
};

export const dataTablePreviewRenderer: PanelPreviewRenderer<DataTablePanelConfig> = {
  getQuery: getDataSourceQuery,
  renderSvg: renderDataTablePreviewSvg,
};
