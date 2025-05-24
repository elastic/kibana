import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import {
  EuiFormRow,
  EuiFieldText,
  EuiText,
  useEuiTheme,
  EuiComboBox,
} from '@elastic/eui';
import { PaletteRegistry } from '@kbn/coloring';
import { useDebouncedValue } from '@kbn/visualization-utils';
import type { VisualizationDimensionEditorProps } from '../../../types';
import type { DatatableVisualizationState } from '../visualization';

import type { ColumnState } from '../../../../common/expressions';

import {
  getDefaultSummaryLabel,
  getFinalSummaryConfiguration,
  getSummaryRowOptions,
} from '../../../../common/expressions/impl/datatable/summary';
import { isNumericFieldForDatatable } from '../../../../common/expressions/impl/datatable/utils';
import { DatatableInspectorTables } from '../../../../common/expressions/defs/datatable/datatable';

type ColumnType = DatatableVisualizationState['columns'][number];
type SummaryRowType = Extract<ColumnState['summaryRow'], string>;

function updateColumnWith(
  state: DatatableVisualizationState,
  columnId: string,
  newColumnProps: Partial<ColumnType>
) {
  return state.columns.map((currentColumn) =>
    currentColumn.columnId === columnId
      ? { ...currentColumn, ...newColumnProps }
      : currentColumn
  );
}

export function TableDimensionEditorAdditionalSection(
  props: VisualizationDimensionEditorProps<DatatableVisualizationState> & {
    paletteService: PaletteRegistry;
  }
) {
  const { state, setState, frame, accessor } = props;
  const column = state.columns.find(({ columnId }) => accessor === columnId);
  const onSummaryLabelChangeToDebounce = useCallback(
    (newSummaryLabel: string | undefined) => {
      setState({
        ...state,
        columns: updateColumnWith(state, accessor, { summaryLabel: newSummaryLabel }),
      });
    },
    [accessor, setState, state]
  );
  const { inputValue: summaryLabel, handleInputChange: onSummaryLabelChange } =
    useDebouncedValue<string | undefined>(
      {
        onChange: onSummaryLabelChangeToDebounce,
        value: column?.summaryLabel,
      },
      { allowFalsyValue: true }
    );

  const { euiTheme } = useEuiTheme();

  if (!column) return null;
  if (column.isTransposed) return null;

  const currentData =
    frame.activeData?.[state.layerId] ?? frame.activeData?.[DatatableInspectorTables.Default];

  const isNumeric = isNumericFieldForDatatable(currentData, accessor);
  const { summaryRow, summaryLabel: fallbackSummaryLabel } = getFinalSummaryConfiguration(
    accessor,
    column,
    currentData
  );

  return (
    <>
      {isNumeric && (
        <div className={`${styles.container}`}>
          <EuiText size="s" className={styles.headingText}>
            <h4>
              {i18n.translate('xpack.lens.indexPattern.dimensionEditor.headingSummary', {
                defaultMessage: 'Summary',
              })}
            </h4>
          </EuiText>

          <>
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.lens.table.summaryRow.label', {
                defaultMessage: 'Summary Row',
              })}
              display="columnCompressed"
            >
              <EuiComboBox
                fullWidth
                compressed
                isClearable={false}
                data-test-subj="lnsDatatable_summaryrow_function"
                placeholder={i18n.translate('xpack.lens.indexPattern.fieldPlaceholder', {
                  defaultMessage: 'Field',
                })}
                options={getSummaryRowOptions()}
                selectedOptions={[
                  {
                    label: getDefaultSummaryLabel(summaryRow),
                    value: summaryRow,
                  },
                ]}
                singleSelection={{ asPlainText: true }}
                onChange={(choices) => {
                  const newValue = choices[0].value as SummaryRowType;
                  setState({
                    ...state,
                    columns: updateColumnWith(state, accessor, { summaryRow: newValue }),
                  });
                }}
              />
            </EuiFormRow>
            {summaryRow !== 'none' && (
              <EuiFormRow
                display="columnCompressed"
                fullWidth
                label={i18n.translate('xpack.lens.table.summaryRow.customlabel', {
                  defaultMessage: 'Summary label',
                })}
              >
                <EuiFieldText
                  fullWidth
                  compressed
                  data-test-subj="lnsDatatable_summaryrow_label"
                  value={summaryLabel ?? fallbackSummaryLabel}
                  onChange={(e) => {
                    onSummaryLabelChange(e.target.value);
                  }}
                />
              </EuiFormRow>
            )}
          </>
        </div>
      )}
    </>
  );
}

const styles = {
  container: css({
    paddingBottom: '16px', // lnsIndexPatternDimensionEditor--padded approximation
  }),
  headingText: css({
    marginBottom: 'var(--euiSizeBase)', // euiTheme.size.base but no euiTheme access outside component
  }),
};
