/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiFormRow, EuiSwitch, EuiToolTip } from '@elastic/eui';
import type { DataGridDensity, DatatableVisualizationState, RowHeightMode } from '@kbn/lens-common';
import {
  DEFAULT_HEADER_ROW_HEIGHT,
  DEFAULT_HEADER_ROW_HEIGHT_LINES,
  DEFAULT_ROW_HEIGHT,
  DEFAULT_ROW_HEIGHT_LINES,
  ROW_HEIGHT_LINES_KEYS,
  LENS_ROW_HEIGHT_MODE,
  LENS_DATAGRID_DENSITY,
} from '@kbn/lens-common';
import { RowHeightSettings } from '@kbn/unified-data-table';
import { DEFAULT_PAGE_SIZE } from './table_basic';

type LineCounts = {
  [key in keyof typeof ROW_HEIGHT_LINES_KEYS]: number;
};

const LEGACY_SINGLE_ROW_HEIGHT_MODE = 'single';

export function DatatableAppearanceSettings({
  state,
  setState,
}: {
  state: DatatableVisualizationState;
  setState: (newState: DatatableVisualizationState) => void;
}) {
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
      const newRowHeightLines =
        newHeightMode === LENS_ROW_HEIGHT_MODE.auto
          ? LENS_ROW_HEIGHT_MODE.auto
          : lineCounts[heightLinesProperty];

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

  const onChangeDensity = useCallback(
    (density: DataGridDensity) => {
      setState({
        ...state,
        density,
      });
    },
    [setState, state]
  );

  return (
    <>
      <DensitySettings
        dataGridDensity={state.density ?? LENS_DATAGRID_DENSITY.NORMAL}
        onChange={onChangeDensity}
      />
      <RowHeightSettings
        rowHeight={state.headerRowHeight ?? DEFAULT_HEADER_ROW_HEIGHT}
        label={i18n.translate('xpack.lens.table.visualOptionsHeaderRowHeightLabel', {
          defaultMessage: 'Max header cell lines',
        })}
        onChangeRowHeight={(mode) =>
          onChangeHeight(mode, 'headerRowHeight', ROW_HEIGHT_LINES_KEYS.headerRowHeightLines)
        }
        onChangeLineCountInput={(lines) => {
          onChangeHeightLines(lines, ROW_HEIGHT_LINES_KEYS.headerRowHeightLines);
        }}
        data-test-subj="lnsHeaderHeightSettings"
        maxRowHeight={5}
        lineCountInput={lineCounts[ROW_HEIGHT_LINES_KEYS.headerRowHeightLines]}
        fullWidth
      />
      <RowHeightSettings
        rowHeight={
          // @ts-ignore - saved state can contain legacy row height mode
          state.rowHeight === LEGACY_SINGLE_ROW_HEIGHT_MODE
            ? LENS_ROW_HEIGHT_MODE.custom
            : state.rowHeight ?? DEFAULT_ROW_HEIGHT
        }
        label={i18n.translate('xpack.lens.table.visualOptionsFitRowToContentLabel', {
          defaultMessage: 'Body cell lines',
        })}
        onChangeRowHeight={(mode) =>
          onChangeHeight(mode, 'rowHeight', ROW_HEIGHT_LINES_KEYS.rowHeightLines)
        }
        onChangeLineCountInput={(lines) => {
          onChangeHeightLines(lines, ROW_HEIGHT_LINES_KEYS.rowHeightLines);
        }}
        data-test-subj="lnsRowHeightSettings"
        lineCountInput={lineCounts[ROW_HEIGHT_LINES_KEYS.rowHeightLines]}
        fullWidth
      />
      <EuiFormRow
        label={i18n.translate('xpack.lens.table.visualOptionsPaginateTable', {
          defaultMessage: 'Paginate table',
        })}
        display="columnCompressed"
        fullWidth
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
      <EuiFormRow
        label={i18n.translate('xpack.lens.table.visualOptionsShowRowNumbers', {
          defaultMessage: 'Show row numbers',
        })}
        display="columnCompressed"
        fullWidth
      >
        <EuiSwitch
          compressed
          data-test-subj="lens-table-row-numbers-switch"
          label=""
          showLabel={false}
          checked={!!state.showRowNumbers}
          onChange={() => setState({ ...state, showRowNumbers: !state.showRowNumbers })}
        />
      </EuiFormRow>
    </>
  );
}

interface DensitySettingsProps {
  dataGridDensity: DataGridDensity;
  onChange: (density: DataGridDensity) => void;
}

const densityValues = Object.values(LENS_DATAGRID_DENSITY);

const getValidDensity = (density: string) => {
  const isValidDensity = densityValues.includes(density as DataGridDensity);
  return isValidDensity ? (density as DataGridDensity) : LENS_DATAGRID_DENSITY.NORMAL;
};

const densityLabel = i18n.translate('xpack.lens.table.densityLabel', {
  defaultMessage: 'Density',
});

const densityOptions = [
  {
    id: LENS_DATAGRID_DENSITY.COMPACT,
    label: i18n.translate('xpack.lens.table.labelCompact', {
      defaultMessage: 'Compact',
    }),
  },
  {
    id: LENS_DATAGRID_DENSITY.NORMAL,
    label: i18n.translate('xpack.lens.table.labelNormal', {
      defaultMessage: 'Normal',
    }),
  },
  {
    id: LENS_DATAGRID_DENSITY.EXPANDED,
    label: i18n.translate('xpack.lens.table.labelExpanded', {
      defaultMessage: 'Expanded',
    }),
  },
];

const DensitySettings: React.FC<DensitySettingsProps> = ({ dataGridDensity, onChange }) => {
  // Falls back to NORMAL density when an invalid density is provided
  const validDensity = getValidDensity(dataGridDensity);

  const setDensity = useCallback(
    (density: string) => {
      onChange(getValidDensity(density));
    },
    [onChange]
  );

  return (
    <EuiFormRow
      label={densityLabel}
      aria-label={densityLabel}
      display="columnCompressed"
      data-test-subj="lnsDensitySettings"
      fullWidth
    >
      <EuiButtonGroup
        legend={densityLabel}
        buttonSize="compressed"
        isFullWidth
        options={densityOptions}
        onChange={setDensity}
        idSelected={validDensity}
      />
    </EuiFormRow>
  );
};
