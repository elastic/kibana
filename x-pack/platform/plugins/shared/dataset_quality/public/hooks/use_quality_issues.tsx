/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { useSelector } from '@xstate/react';
import { orderBy } from 'lodash';
import React, { useCallback, useMemo } from 'react';
import type { FailedDocsError, QualityIssue } from '../../common/api_types';
import {
  DEFAULT_FAILED_DOCS_ERROR_SORT_DIRECTION,
  DEFAULT_FAILED_DOCS_ERROR_SORT_FIELD,
  DEFAULT_QUALITY_ISSUE_SORT_DIRECTION,
  DEFAULT_QUALITY_ISSUE_SORT_FIELD,
} from '../../common/constants';
import {
  degradedFieldCauseFieldIgnored,
  degradedFieldCauseFieldIgnoredTooltip,
  degradedFieldCauseFieldLimitExceeded,
  degradedFieldCauseFieldLimitExceededTooltip,
  degradedFieldCauseFieldMalformed,
  degradedFieldCauseFieldMalformedTooltip,
} from '../../common/translations';
import type { SortDirection } from '../../common/types';
import type { QualityIssueType } from '../state_machines/dataset_quality_details_controller';
import { useKibanaContextForPlugin } from '../utils';
import { useDatasetQualityDetailsState } from './use_dataset_quality_details_state';
import { getFailedDocsErrorsColumns } from '../components/dataset_quality_details/quality_issue_flyout/failed_docs/columns';

export type QualityIssueSortField = keyof QualityIssue;
export type FailedDocsErrorSortField = keyof FailedDocsError;

export function useQualityIssues() {
  const { service } = useDatasetQualityDetailsState();
  const {
    services: { fieldFormats },
  } = useKibanaContextForPlugin();

  const {
    qualityIssues,
    expandedQualityIssue: expandedDegradedField,
    selectedIssueTypes,
    selectedFields,
    failedDocsErrors,
  } = useSelector(service, (state) => state.context);
  const { data, table } = qualityIssues ?? {};
  const { page, rowsPerPage, sort } = table;

  const { data: failedDocsErrorsData, table: failedDocsErrorsTable } = failedDocsErrors ?? {};
  const {
    page: failedDocsErrorsPage,
    rowsPerPage: failedDocsErrorsRowsPerPage,
    sort: failedDocsErrorsSort,
  } = failedDocsErrorsTable;

  const filteredItems = useMemo(() => {
    if (!data) return [];

    return data.filter(
      (item) =>
        (selectedIssueTypes.length === 0 || selectedIssueTypes.includes(item.type)) &&
        (selectedFields.length === 0 || selectedFields.includes(item.name))
    );
  }, [data, selectedIssueTypes, selectedFields]);

  const totalItemCount = filteredItems?.length ?? 0;

  const pagination = {
    pageIndex: page,
    pageSize: rowsPerPage,
    totalItemCount,
    hidePerPageOptions: true,
  };

  const onTableChange = useCallback(
    (options: {
      page: { index: number; size: number };
      sort?: { field: QualityIssueSortField; direction: SortDirection };
    }) => {
      service.send({
        type: 'UPDATE_QUALITY_ISSUES_TABLE_CRITERIA',
        quality_issues_criteria: {
          page: options.page.index,
          rowsPerPage: options.page.size,
          sort: {
            field: options.sort?.field || DEFAULT_QUALITY_ISSUE_SORT_FIELD,
            direction: options.sort?.direction || DEFAULT_QUALITY_ISSUE_SORT_DIRECTION,
          },
        },
      });
    },
    [service]
  );

  const renderedItems = useMemo(() => {
    const sortedItems = orderBy(filteredItems, sort.field, sort.direction);
    return sortedItems.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  }, [filteredItems, sort.field, sort.direction, page, rowsPerPage]);

  const expandedRenderedItem = useMemo(() => {
    return renderedItems.find(
      (item) =>
        item.name === expandedDegradedField?.name && item.type === expandedDegradedField?.type
    );
  }, [expandedDegradedField, renderedItems]);

  const isFailedDocsErrorsLoading = useSelector(service, (state) => {
    return state.matches('initializing.qualityIssueFlyout.open.failedDocsFlyout.fetching');
  });

  const isDegradedFieldsLoading = useSelector(
    service,
    (state) =>
      state.matches('initializing.dataStreamSettings.fetchingDataStreamSettings') ||
      state.matches(
        'initializing.dataStreamSettings.qualityIssues.dataStreamDegradedFields.fetchingDataStreamDegradedFields'
      )
  );

  const closeDegradedFieldFlyout = useCallback(
    () => service.send({ type: 'CLOSE_DEGRADED_FIELD_FLYOUT' }),
    [service]
  );

  const openDegradedFieldFlyout = useCallback(
    (fieldName: string, qualityIssueType: QualityIssueType) => {
      if (
        expandedDegradedField?.name === fieldName &&
        expandedDegradedField?.type === qualityIssueType
      ) {
        service.send({ type: 'CLOSE_DEGRADED_FIELD_FLYOUT' });
      } else {
        service.send({
          type: 'OPEN_QUALITY_ISSUE_FLYOUT',
          qualityIssue: {
            name: fieldName,
            type: qualityIssueType,
          },
        });
      }
    },
    [expandedDegradedField, service]
  );

  const degradedFieldValues = useSelector(service, (state) =>
    state.matches('initializing.qualityIssueFlyout.open.degradedFieldFlyout.ignoredValues.done')
      ? 'degradedFieldValues' in state.context
        ? state.context.degradedFieldValues
        : undefined
      : undefined
  );

  const degradedFieldAnalysis = useSelector(service, (state) =>
    state.matches('initializing.qualityIssueFlyout.open.degradedFieldFlyout.mitigation.analyzed') ||
    state.matches(
      'initializing.qualityIssueFlyout.open.degradedFieldFlyout.mitigation.mitigating'
    ) ||
    state.matches(
      'initializing.qualityIssueFlyout.open.degradedFieldFlyout.mitigation.askingForRollover'
    ) ||
    state.matches(
      'initializing.qualityIssueFlyout.open.degradedFieldFlyout.mitigation.rollingOver'
    ) ||
    state.matches('initializing.qualityIssueFlyout.open.degradedFieldFlyout.mitigation.success') ||
    state.matches('initializing.qualityIssueFlyout.open.degradedFieldFlyout.mitigation.error')
      ? 'degradedFieldAnalysis' in state.context
        ? state.context.degradedFieldAnalysis
        : undefined
      : undefined
  );

  const degradedFieldAnalysisFormattedResult = useMemo(() => {
    if (!degradedFieldAnalysis) {
      return undefined;
    }

    // 1st check if it's a field limit issue
    if (degradedFieldAnalysis.isFieldLimitIssue) {
      return {
        isFieldLimitIssue: true,
        potentialCause: degradedFieldCauseFieldLimitExceeded,
        tooltipContent: degradedFieldCauseFieldLimitExceededTooltip,
        shouldDisplayIgnoredValuesAndLimit: false,
        identifiedUsingHeuristics: true,
      };
    }

    // 2nd check if it's a ignored above issue
    const fieldMapping = degradedFieldAnalysis.fieldMapping;

    if (fieldMapping && fieldMapping?.type === 'keyword' && fieldMapping?.ignore_above) {
      const isAnyValueExceedingIgnoreAbove = degradedFieldValues?.values.some(
        (value: string) => value.length > fieldMapping.ignore_above!
      );
      if (isAnyValueExceedingIgnoreAbove) {
        return {
          isFieldCharacterLimitIssue: true,
          potentialCause: degradedFieldCauseFieldIgnored,
          tooltipContent: degradedFieldCauseFieldIgnoredTooltip,
          shouldDisplayIgnoredValuesAndLimit: true,
          identifiedUsingHeuristics: true,
        };
      }
    }

    // 3rd check if its a ignore_malformed issue. There is no check, at the moment.
    return {
      isFieldMalformedIssue: true,
      potentialCause: degradedFieldCauseFieldMalformed,
      tooltipContent: degradedFieldCauseFieldMalformedTooltip,
      shouldDisplayIgnoredValuesAndLimit: false,
      identifiedUsingHeuristics: false, // TODO: Add heuristics to identify ignore_malformed issues
    };
  }, [degradedFieldAnalysis, degradedFieldValues]);

  const isDegradedFieldsValueLoading = useSelector(service, (state) => {
    return state.matches(
      'initializing.qualityIssueFlyout.open.degradedFieldFlyout.ignoredValues.fetching'
    );
  });

  const isRolloverRequired = useSelector(service, (state) => {
    return state.matches(
      'initializing.qualityIssueFlyout.open.degradedFieldFlyout.mitigation.askingForRollover'
    );
  });

  const isMitigationAppliedSuccessfully = useSelector(service, (state) => {
    return state.matches(
      'initializing.qualityIssueFlyout.open.degradedFieldFlyout.mitigation.success'
    );
  });

  const isAnalysisInProgress = useSelector(service, (state) => {
    return state.matches(
      'initializing.qualityIssueFlyout.open.degradedFieldFlyout.mitigation.analyzing'
    );
  });

  const isRolloverInProgress = useSelector(service, (state) => {
    return state.matches(
      'initializing.qualityIssueFlyout.open.degradedFieldFlyout.mitigation.rollingOver'
    );
  });

  const updateNewFieldLimit = useCallback(
    (newFieldLimit: number) => {
      service.send({ type: 'SET_NEW_FIELD_LIMIT', newFieldLimit });
    },
    [service]
  );

  const isMitigationInProgress = useSelector(service, (state) => {
    return state.matches(
      'initializing.qualityIssueFlyout.open.degradedFieldFlyout.mitigation.mitigating'
    );
  });

  const newFieldLimitData = useSelector(service, (state) =>
    state.matches('initializing.qualityIssueFlyout.open.degradedFieldFlyout.mitigation.success') ||
    state.matches('initializing.qualityIssueFlyout.open.degradedFieldFlyout.mitigation.error')
      ? state.context.fieldLimit
      : undefined
  );

  const triggerRollover = useCallback(() => {
    service.send({ type: 'ROLLOVER_DATA_STREAM' });
  }, [service]);

  const failedDocsErrorsColumns = useMemo(() => getFailedDocsErrorsColumns(), []);

  const renderedFailedDocsErrorsItems = useMemo(() => {
    const sortedItems = orderBy(
      failedDocsErrorsData,
      failedDocsErrorsSort.field,
      failedDocsErrorsSort.direction
    );
    return sortedItems.slice(
      failedDocsErrorsPage * failedDocsErrorsRowsPerPage,
      (failedDocsErrorsPage + 1) * failedDocsErrorsRowsPerPage
    );
  }, [
    failedDocsErrorsData,
    failedDocsErrorsSort.field,
    failedDocsErrorsSort.direction,
    failedDocsErrorsPage,
    failedDocsErrorsRowsPerPage,
  ]);

  const onFailedDocsErrorsTableChange = useCallback(
    (options: {
      page: { index: number; size: number };
      sort?: { field: FailedDocsErrorSortField; direction: SortDirection };
    }) => {
      service.send({
        type: 'UPDATE_FAILED_DOCS_ERRORS_TABLE_CRITERIA',
        failed_docs_errors_criteria: {
          page: options.page.index,
          rowsPerPage: options.page.size,
          sort: {
            field: options.sort?.field || DEFAULT_FAILED_DOCS_ERROR_SORT_FIELD,
            direction: options.sort?.direction || DEFAULT_FAILED_DOCS_ERROR_SORT_DIRECTION,
          },
        },
      });
    },
    [service]
  );

  const failedDocsErrorsPagination = {
    pageIndex: failedDocsErrorsPage,
    pageSize: failedDocsErrorsRowsPerPage,
    totalItemCount: failedDocsErrorsData?.length ?? 0,
    hidePerPageOptions: true,
  };

  const resultsCount = useMemo(() => {
    const startNumberItemsOnPage =
      failedDocsErrorsRowsPerPage * failedDocsErrorsPage +
      (renderedFailedDocsErrorsItems.length ? 1 : 0);
    const endNumberItemsOnPage =
      failedDocsErrorsRowsPerPage * failedDocsErrorsPage + renderedFailedDocsErrorsItems.length;

    return failedDocsErrorsRowsPerPage === 0 ? (
      <strong>
        {i18n.translate('xpack.datasetQuality.resultsCount.strong.lllLabel', {
          defaultMessage: 'lll',
        })}
      </strong>
    ) : (
      <>
        <strong>
          {startNumberItemsOnPage}-{endNumberItemsOnPage}
        </strong>{' '}
        {' of '} {failedDocsErrorsData?.length}
      </>
    );
  }, [
    failedDocsErrorsRowsPerPage,
    failedDocsErrorsPage,
    renderedFailedDocsErrorsItems.length,
    failedDocsErrorsData?.length,
  ]);

  return {
    isDegradedFieldsLoading,
    pagination,
    onTableChange,
    renderedItems,
    sort: { sort },
    fieldFormats,
    totalItemCount,
    expandedDegradedField,
    openDegradedFieldFlyout,
    closeDegradedFieldFlyout,
    degradedFieldValues,
    isDegradedFieldsValueLoading,
    isAnalysisInProgress,
    degradedFieldAnalysis,
    degradedFieldAnalysisFormattedResult,
    expandedRenderedItem,
    updateNewFieldLimit,
    isMitigationInProgress,
    isRolloverInProgress,
    newFieldLimitData,
    isRolloverRequired,
    isMitigationAppliedSuccessfully,
    triggerRollover,
    renderedFailedDocsErrorsItems,
    failedDocsErrorsSort: { sort: failedDocsErrorsSort },
    resultsCount,
    failedDocsErrorsColumns,
    isFailedDocsErrorsLoading,
    failedDocsErrorsPagination,
    onFailedDocsErrorsTableChange,
  };
}
