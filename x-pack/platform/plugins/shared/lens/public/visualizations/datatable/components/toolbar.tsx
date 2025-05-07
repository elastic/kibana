/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonGroup,
  type EuiButtonGroupOptionProps,
  EuiFlexGroup,
  EuiFormRow,
  EuiI18n,
  EuiSwitch,
  EuiToolTip,
} from '@elastic/eui';
import { DataGridDensity, RowHeightSettings, ROWS_HEIGHT_OPTIONS } from '@kbn/unified-data-table';
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
  ROW_HEIGHT_LINES_KEYS,
} from './constants';

type LineCounts = {
  [key in keyof typeof ROW_HEIGHT_LINES_KEYS]: number;
};

const LEGACY_SINGLE_ROW_HEIGHT_MODE = 'single';

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
      const newRowHeightLines =
        newHeightMode === RowHeightMode.auto
          ? ROWS_HEIGHT_OPTIONS.auto
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
        <DensitySettings
          dataGridDensity={state.density ?? DataGridDensity.NORMAL}
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
        />
        <RowHeightSettings
          rowHeight={
            // @ts-ignore - saved state can contain legacy row height mode
            state.rowHeight === LEGACY_SINGLE_ROW_HEIGHT_MODE
              ? RowHeightMode.custom
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

interface DensitySettingsProps {
  dataGridDensity: DataGridDensity;
  onChange: (density: DataGridDensity) => void;
}

const DENSITY_TOKENS = [
  'euiDisplaySelector.densityLabel',
  'euiDisplaySelector.labelCompact',
  'euiDisplaySelector.labelNormal',
  'euiDisplaySelector.labelExpanded',
];

const DENSITY_DEFAULTS = ['Density', 'Compact', 'Normal', 'Expanded'];

const getDensityOptions = ({
  labelCompact,
  labelNormal,
  labelExpanded,
}: {
  labelCompact: string;
  labelNormal: string;
  labelExpanded: string;
}): EuiButtonGroupOptionProps[] => [
  { id: DataGridDensity.COMPACT, label: labelCompact },
  { id: DataGridDensity.NORMAL, label: labelNormal },
  { id: DataGridDensity.EXPANDED, label: labelExpanded },
];

const DensitySettings: React.FC<DensitySettingsProps> = ({ dataGridDensity, onChange }) => {
  const isValidDensity = (value: string): value is DataGridDensity => {
    return Object.values(DataGridDensity).includes(value as DataGridDensity);
  };

  const setDensity = useCallback(
    (density: string) => {
      const _density = isValidDensity(density) ? density : DataGridDensity.NORMAL;
      onChange(_density);
    },
    [onChange]
  );

  return (
    <EuiI18n tokens={DENSITY_TOKENS} defaults={DENSITY_DEFAULTS}>
      {([densityLabel, labelCompact, labelNormal, labelExpanded]: string[]) => {
        const densityOptions = getDensityOptions({ labelCompact, labelNormal, labelExpanded });
        return (
          <EuiFormRow
            label={densityLabel}
            display="columnCompressed"
            data-test-subj="lnsDensitySettings"
          >
            <EuiButtonGroup
              legend={densityLabel}
              buttonSize="compressed"
              isFullWidth
              options={densityOptions}
              onChange={setDensity}
              idSelected={dataGridDensity}
            />
          </EuiFormRow>
        );
      }}
    </EuiI18n>
  );
};
