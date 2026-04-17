/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import {
  clearAllRowState,
  setGroupResults,
  useAppDispatch,
  useAppSelector,
} from '@kbn/aiops-log-rate-analysis/state';
import {
  commonColumns,
  significantItemColumns,
  setSkippedColumns,
  type LogRateAnalysisResultsTableColumnName,
} from '@kbn/aiops-log-rate-analysis/state/log_rate_analysis_table_slice';
import { setCurrentFieldFilterSkippedItems } from '@kbn/aiops-log-rate-analysis/state/log_rate_analysis_field_candidates_slice';

import { ItemFilterPopover as FieldFilterPopover } from './item_filter_popover';
import { ItemFilterPopover as ColumnFilterPopover } from './item_filter_popover';

const groupResultsMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTable.groupedSwitchLabel.groupResults',
  {
    defaultMessage: 'Smart grouping',
  }
);
const fieldFilterHelpText = i18n.translate('xpack.aiops.logRateAnalysis.page.fieldFilterHelpText', {
  defaultMessage:
    'Deselect non-relevant fields to remove them from the analysis and click the Apply button to rerun the analysis.  Use the search bar to filter the list, then select/deselect multiple fields with the actions below.',
});
const columnsFilterHelpText = i18n.translate(
  'xpack.aiops.logRateAnalysis.page.columnsFilterHelpText',
  {
    defaultMessage: 'Configure visible columns.',
  }
);
const disabledFieldFilterApplyButtonTooltipContent = i18n.translate(
  'xpack.aiops.analysis.fieldSelectorNotEnoughFieldsSelected',
  {
    defaultMessage: 'Grouping requires at least 2 fields to be selected.',
  }
);
const disabledColumnFilterApplyButtonTooltipContent = i18n.translate(
  'xpack.aiops.analysis.columnSelectorNotEnoughColumnsSelected',
  {
    defaultMessage: 'At least one column must be selected.',
  }
);
const columnSearchAriaLabel = i18n.translate('xpack.aiops.analysis.columnSelectorAriaLabel', {
  defaultMessage: 'Filter columns',
});
const columnsButton = i18n.translate('xpack.aiops.logRateAnalysis.page.columnsFilterButtonLabel', {
  defaultMessage: 'Columns',
});
const fieldsButton = i18n.translate('xpack.aiops.analysis.fieldsButtonLabel', {
  defaultMessage: 'Fields',
});
const groupResultsOffMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTable.groupedSwitchLabel.groupResultsOff',
  {
    defaultMessage: 'Off',
  }
);
const groupResultsOnMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTable.groupedSwitchLabel.groupResultsOn',
  {
    defaultMessage: 'On',
  }
);
const resultsGroupedOffId = 'aiopsLogRateAnalysisGroupingOff';
const resultsGroupedOnId = 'aiopsLogRateAnalysisGroupingOn';

export interface LogRateAnalysisOptionsProps {
  foundGroups: boolean;
  growFirstItem?: boolean;
}

export const LogRateAnalysisOptions: FC<LogRateAnalysisOptionsProps> = ({
  foundGroups,
  growFirstItem = false,
}) => {
  const dispatch = useAppDispatch();

  const { groupResults } = useAppSelector((s) => s.logRateAnalysis);
  const { isRunning } = useAppSelector((s) => s.stream);
  const fieldCandidates = useAppSelector((s) => s.logRateAnalysisFieldCandidates);
  const { skippedColumns } = useAppSelector((s) => s.logRateAnalysisTable);
  const { fieldFilterUniqueItems, initialFieldFilterSkippedItems } = fieldCandidates;
  const fieldFilterButtonDisabled =
    isRunning || fieldCandidates.isLoading || fieldFilterUniqueItems.length === 0;
  const toggleIdSelected = groupResults ? resultsGroupedOnId : resultsGroupedOffId;

  const onGroupResultsToggle = (optionId: string) => {
    dispatch(setGroupResults(optionId === resultsGroupedOnId));
    // When toggling the group switch, clear all row selections
    dispatch(clearAllRowState());
  };

  const onVisibleColumnsChange = (columns: LogRateAnalysisResultsTableColumnName[]) => {
    dispatch(setSkippedColumns(columns));
  };

  const onFieldsFilterChange = (skippedFieldsUpdate: string[]) => {
    dispatch(setCurrentFieldFilterSkippedItems(skippedFieldsUpdate));
  };

  // Disable the grouping switch toggle only if no groups were found,
  // the toggle wasn't enabled already and no fields were selected to be skipped.
  const disabledGroupResultsSwitch = !foundGroups && !groupResults;

  const toggleButtons = [
    {
      id: resultsGroupedOffId,
      label: groupResultsOffMessage,
      'data-test-subj': 'aiopsLogRateAnalysisGroupSwitchOff',
    },
    {
      id: resultsGroupedOnId,
      label: groupResultsOnMessage,
      'data-test-subj': 'aiopsLogRateAnalysisGroupSwitchOn',
    },
  ];

  return (
    <>
      <EuiFlexItem grow={growFirstItem}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText size="xs">{groupResultsMessage}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              data-test-subj={`aiopsLogRateAnalysisGroupSwitch${groupResults ? ' checked' : ''}`}
              buttonSize="s"
              isDisabled={disabledGroupResultsSwitch}
              legend={groupResultsMessage}
              options={toggleButtons}
              idSelected={toggleIdSelected}
              onChange={onGroupResultsToggle}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FieldFilterPopover
          dataTestSubj="aiopsFieldFilterButton"
          disabled={fieldFilterButtonDisabled}
          disabledApplyButton={fieldFilterButtonDisabled}
          disabledApplyTooltipContent={disabledFieldFilterApplyButtonTooltipContent}
          helpText={fieldFilterHelpText}
          itemSearchAriaLabel={fieldsButton}
          popoverButtonTitle={fieldsButton}
          selectedItemLimit={1}
          uniqueItemNames={fieldFilterUniqueItems}
          initialSkippedItems={initialFieldFilterSkippedItems}
          onChange={onFieldsFilterChange}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ColumnFilterPopover
          dataTestSubj="aiopsColumnFilterButton"
          disabled={isRunning}
          disabledApplyButton={isRunning}
          disabledApplyTooltipContent={disabledColumnFilterApplyButtonTooltipContent}
          helpText={columnsFilterHelpText}
          itemSearchAriaLabel={columnSearchAriaLabel}
          initialSkippedItems={skippedColumns}
          popoverButtonTitle={columnsButton}
          selectedItemLimit={1}
          uniqueItemNames={
            (groupResults
              ? Object.values(commonColumns)
              : Object.values(significantItemColumns)) as string[]
          }
          onChange={onVisibleColumnsChange as (columns: string[]) => void}
        />
      </EuiFlexItem>
    </>
  );
};
