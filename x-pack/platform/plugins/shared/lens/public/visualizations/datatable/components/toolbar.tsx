/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFormRow, EuiSwitch, EuiToolTip } from '@elastic/eui';
import { RowHeightSettings } from '@kbn/unified-data-table';
import { ToolbarPopover } from '../../../shared_components';
import type { VisualizationToolbarProps } from '../../../types';
import type { DatatableVisualizationState } from '../visualization';
import { RowHeightMode } from '../../../../common/types';
import { DEFAULT_PAGE_SIZE } from './table_basic';
import {
  DEFAULT_HEADER_ROW_HEIGHT,
  DEFAULT_HEADER_ROW_HEIGHT_LINES,
  DEFAULT_ROW_HEIGHT,
  DEFAULT_ROW_HEIGHT_LINES,
  ROWS_HEIGHT_OPTIONS,
  ROW_HEIGHT_LINES_KEYS,
} from './constants';

type LineCounts = {
  [key in keyof typeof ROW_HEIGHT_LINES_KEYS]: number;
};

export function DataTableToolbar(props: VisualizationToolbarProps<DatatableVisualizationState>) {
  const { state, setState } = props;

  const [lineCounts, setLineCounts] = useState<LineCounts>({
    [ROW_HEIGHT_LINES_KEYS.headerRowHeightLines]:
      state.headerRowHeightLines && state.headerRowHeightLines > 0
        ? state.headerRowHeightLines
        : DEFAULT_HEADER_ROW_HEIGHT_LINES,
    [ROW_HEIGHT_LINES_KEYS.rowHeightLines]:
      state.rowHeightLines && state.rowHeightLines > 0
        ? state.rowHeightLines
        : DEFAULT_ROW_HEIGHT_LINES,
  });

  const onChangeHeight = useCallback(
    (
      newHeightMode: RowHeightMode | undefined,
      heightProperty: string,
      heightLinesProperty: keyof typeof ROW_HEIGHT_LINES_KEYS
    ) => {
      let newRowHeightLines;

      switch (newHeightMode) {
        case RowHeightMode.auto:
          newRowHeightLines = ROWS_HEIGHT_OPTIONS.auto;
          break;
        case RowHeightMode.single:
          newRowHeightLines = ROWS_HEIGHT_OPTIONS.single;
          break;
        default:
          newRowHeightLines = lineCounts[heightLinesProperty];
      }

      setState({
        ...state,
        [heightProperty]: newHeightMode,
        [heightLinesProperty]: newRowHeightLines,
      });
    },
    [setState, state, lineCounts]
  );

  const onChangeHeightLines = useCallback(
    (newRowHeightLines: number, heightLinesProperty: keyof typeof ROW_HEIGHT_LINES_KEYS) => {
      setState({
        ...state,
        [heightLinesProperty]: newRowHeightLines,
      });

      setLineCounts({
        ...lineCounts,
        [heightLinesProperty]: newRowHeightLines,
      });
    },
    [setState, state, lineCounts]
  );

  const onTogglePagination = useCallback(() => {
    const current = state.paging ?? { size: DEFAULT_PAGE_SIZE, enabled: false };

    setState({
      ...state,
      paging: { ...current, enabled: !current.enabled },
    });
  }, [setState, state]);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
      <ToolbarPopover
        title={i18n.translate('xpack.lens.table.valuesVisualOptions', {
          defaultMessage: 'Visual options',
        })}
        type="visualOptions"
        groupPosition="none"
        buttonDataTestSubj="lnsVisualOptionsButton"
        data-test-subj="lnsVisualOptionsPopover"
      >
        <RowHeightSettings
          rowHeight={state.headerRowHeight ?? DEFAULT_HEADER_ROW_HEIGHT}
          rowHeightLines={state.headerRowHeightLines ?? DEFAULT_HEADER_ROW_HEIGHT_LINES}
          label={i18n.translate('xpack.lens.table.visualOptionsHeaderRowHeightLabel', {
            defaultMessage: 'Max header cell lines',
          })}
          onChangeRowHeight={(mode) =>
            onChangeHeight(mode, 'headerRowHeight', ROW_HEIGHT_LINES_KEYS.headerRowHeightLines)
          }
          onChangeRowHeightLines={(lines) => {
            onChangeHeightLines(lines, ROW_HEIGHT_LINES_KEYS.headerRowHeightLines);
          }}
          data-test-subj="lnsHeaderHeightSettings"
          maxRowHeight={5}
          lineCountInput={lineCounts[ROW_HEIGHT_LINES_KEYS.headerRowHeightLines]}
        />
        <RowHeightSettings
          rowHeight={state.rowHeight ?? DEFAULT_ROW_HEIGHT}
          rowHeightLines={state.rowHeightLines ?? DEFAULT_ROW_HEIGHT_LINES}
          label={i18n.translate('xpack.lens.table.visualOptionsFitRowToContentLabel', {
            defaultMessage: 'Max body cell lines',
          })}
          onChangeRowHeight={(mode) =>
            onChangeHeight(mode, 'rowHeight', ROW_HEIGHT_LINES_KEYS.rowHeightLines)
          }
          onChangeRowHeightLines={(lines) => {
            onChangeHeightLines(lines, ROW_HEIGHT_LINES_KEYS.rowHeightLines);
          }}
          data-test-subj="lnsRowHeightSettings"
          lineCountInput={lineCounts[ROW_HEIGHT_LINES_KEYS.rowHeightLines]}
        />
        <EuiFormRow
          label={i18n.translate('xpack.lens.table.visualOptionsPaginateTable', {
            defaultMessage: 'Paginate table',
          })}
          display="columnCompressed"
        >
          <EuiToolTip
            content={i18n.translate('xpack.lens.table.visualOptionsPaginateTableTooltip', {
              defaultMessage: 'Pagination is hidden if there are less than 10 items',
            })}
            position="right"
          >
            <EuiSwitch
              compressed
              data-test-subj="lens-table-pagination-switch"
              label=""
              showLabel={false}
              checked={Boolean(state.paging?.enabled)}
              onChange={onTogglePagination}
            />
          </EuiToolTip>
        </EuiFormRow>
      </ToolbarPopover>
    </EuiFlexGroup>
  );
}
