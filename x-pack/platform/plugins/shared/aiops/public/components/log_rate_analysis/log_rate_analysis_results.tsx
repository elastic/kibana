/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { isEqual } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  EuiButtonIcon,
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { ProgressControls } from '@kbn/aiops-components';
import { cancelStream, startStream } from '@kbn/ml-response-stream/client';
import {
  clearAllRowState,
  setGroupResults,
  useAppDispatch,
  useAppSelector,
} from '@kbn/aiops-log-rate-analysis/state';
import {
  getSwappedWindowParameters,
  LOG_RATE_ANALYSIS_TYPE,
  type LogRateAnalysisType,
} from '@kbn/aiops-log-rate-analysis';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SignificantItem, SignificantItemGroup } from '@kbn/ml-agg-utils';
import { AIOPS_ANALYSIS_RUN_ORIGIN, AIOPS_EMBEDDABLE_ORIGIN } from '@kbn/aiops-common/constants';
import type { AiopsLogRateAnalysisSchema } from '@kbn/aiops-log-rate-analysis/api/schema';
import type { AiopsLogRateAnalysisSchemaSignificantItem } from '@kbn/aiops-log-rate-analysis/api/schema_v3';
import {
  setCurrentAnalysisType,
  setCurrentAnalysisWindowParameters,
  resetResults,
} from '@kbn/aiops-log-rate-analysis/api/stream_reducer';
import { fetchFieldCandidates } from '@kbn/aiops-log-rate-analysis/state/log_rate_analysis_field_candidates_slice';

import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { useDataSource } from '../../hooks/use_data_source';

import {
  getGroupTableItems,
  LogRateAnalysisResultsTable,
  LogRateAnalysisResultsGroupsTable,
} from '../log_rate_analysis_results_table';

import { LogRateAnalysisInfoPopover } from './log_rate_analysis_info_popover';
import { LogRateAnalysisOptions } from './log_rate_analysis_options';

const groupResultsHelpMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTable.groupedSwitchLabel.groupResultsHelpMessage',
  {
    defaultMessage: 'Items which are unique to a group are marked by an asterisk (*).',
  }
);

/**
 * Interface for log rate analysis results data.
 */
export interface LogRateAnalysisResultsData {
  /** The type of analysis, whether it's a spike or dip */
  analysisType: LogRateAnalysisType;
  /** Statistically significant field/value items. */
  significantItems: SignificantItem[];
  /** Statistically significant groups of field/value items. */
  significantItemsGroups: SignificantItemGroup[];
}

/**
 * LogRateAnalysis props require a data view.
 */
interface LogRateAnalysisResultsProps {
  /** Callback for resetting the analysis */
  onReset: () => void;
  /** The search query to be applied to the analysis as a filter */
  searchQuery: estypes.QueryDslQueryContainer;
  /** Optional color override for the default bar color for charts */
  barColorOverride?: string;
  /** Optional color override for the highlighted bar color for charts */
  barHighlightColorOverride?: string;
}

export const LogRateAnalysisResults: FC<LogRateAnalysisResultsProps> = ({
  onReset,
  searchQuery,
  barColorOverride,
  barHighlightColorOverride,
}) => {
  const { analytics, http, embeddingOrigin } = useAiopsAppContext();
  const { dataView } = useDataSource();

  const dispatch = useAppDispatch();
  const {
    analysisType,
    earliest,
    latest,
    chartWindowParameters,
    documentStats: { sampleProbability },
    stickyHistogram,
    isBrushCleared,
    groupResults,
  } = useAppSelector((s) => s.logRateAnalysis);
  const { isRunning, errors: streamErrors } = useAppSelector((s) => s.stream);
  const data = useAppSelector((s) => s.logRateAnalysisResults);
  const fieldCandidates = useAppSelector((s) => s.logRateAnalysisFieldCandidates);
  const { skippedColumns } = useAppSelector((s) => s.logRateAnalysisTable);
  const { currentAnalysisWindowParameters } = data;

  // Store the performance metric's start time using a ref
  // to be able to track it across rerenders.
  const analysisStartTime = useRef<number | undefined>(window.performance.now());
  const abortCtrl = useRef(new AbortController());
  const previousSearchQuery = useRef(searchQuery);

  const [overrides, setOverrides] = useState<AiopsLogRateAnalysisSchema['overrides'] | undefined>(
    undefined
  );
  const [shouldStart, setShouldStart] = useState(false);
  const [embeddableOptionsVisible, setEmbeddableOptionsVisible] = useState(false);

  const onEmbeddableOptionsClickHandler = () => {
    setEmbeddableOptionsVisible((s) => !s);
  };

  const { currentFieldFilterSkippedItems, keywordFieldCandidates, textFieldCandidates } =
    fieldCandidates;

  useEffect(() => {
    if (currentFieldFilterSkippedItems === null) return;

    dispatch(resetResults());
    setOverrides({
      loaded: 0,
      remainingKeywordFieldCandidates: keywordFieldCandidates.filter(
        (d) => !currentFieldFilterSkippedItems.includes(d)
      ),
      remainingTextFieldCandidates: textFieldCandidates.filter(
        (d) => !currentFieldFilterSkippedItems.includes(d)
      ),
      regroupOnly: false,
    });
    startHandler(true, false);
    // custom check to trigger on currentFieldFilterSkippedItems change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFieldFilterSkippedItems]);

  function cancelHandler() {
    abortCtrl.current.abort();
    dispatch(cancelStream());
  }

  useEffect(() => {
    if (!isRunning) {
      const {
        loaded,
        remainingKeywordFieldCandidates,
        remainingTextFieldCandidates,
        groupsMissing,
      } = data;

      if (
        loaded < 1 &&
        ((Array.isArray(remainingKeywordFieldCandidates) &&
          remainingKeywordFieldCandidates.length > 0) ||
          (Array.isArray(remainingTextFieldCandidates) &&
            remainingTextFieldCandidates.length > 0) ||
          groupsMissing)
      ) {
        setOverrides({
          loaded,
          remainingKeywordFieldCandidates,
          remainingTextFieldCandidates,
          significantItems: data.significantItems as AiopsLogRateAnalysisSchemaSignificantItem[],
        });
      } else if (loaded > 0) {
        // Reset all overrides.
        setOverrides(undefined);

        // Track performance metric
        if (analysisStartTime.current !== undefined) {
          const analysisDuration = window.performance.now() - analysisStartTime.current;

          // Set this to undefined so reporting the metric gets triggered only once.
          analysisStartTime.current = undefined;

          reportPerformanceMetricEvent(analytics, {
            eventName: 'aiopsLogRateAnalysisCompleted',
            duration: analysisDuration,
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  const errors = useMemo(() => [...streamErrors, ...data.errors], [streamErrors, data.errors]);

  // Start handler clears possibly hovered or pinned
  // significant items on analysis refresh.
  function startHandler(continueAnalysis = false, resetGroupButton = true) {
    if (!continueAnalysis) {
      dispatch(resetResults());
      setOverrides({
        remainingKeywordFieldCandidates: keywordFieldCandidates.filter(
          (d) =>
            currentFieldFilterSkippedItems === null || !currentFieldFilterSkippedItems.includes(d)
        ),
        remainingTextFieldCandidates: textFieldCandidates.filter(
          (d) =>
            currentFieldFilterSkippedItems === null || !currentFieldFilterSkippedItems.includes(d)
        ),
      });
    }

    // Reset grouping to false and clear all row selections when restarting the analysis.
    if (resetGroupButton) {
      dispatch(setGroupResults(false));
      // When toggling the group switch, clear all row selections
      dispatch(clearAllRowState());
    }

    dispatch(setCurrentAnalysisType(analysisType));
    dispatch(setCurrentAnalysisWindowParameters(chartWindowParameters));

    // We trigger hooks updates above so we cannot directly call `start()` here
    // because it would be run with stale arguments.
    setShouldStart(true);
  }

  const startParams = useMemo(() => {
    if (!chartWindowParameters || !earliest || !latest) {
      return undefined;
    }

    return {
      http,
      endpoint: '/internal/aiops/log_rate_analysis',
      apiVersion: '3',
      abortCtrl,
      body: {
        start: earliest,
        end: latest,
        searchQuery: JSON.stringify(searchQuery),
        // TODO Handle data view without time fields.
        timeFieldName: dataView.timeFieldName ?? '',
        index: dataView.getIndexPattern(),
        grouping: true,
        flushFix: true,
        // If analysis type is `spike`, pass on window parameters as is,
        // if it's `dip`, swap baseline and deviation.
        ...(analysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE
          ? chartWindowParameters
          : getSwappedWindowParameters(chartWindowParameters)),
        overrides,
        sampleProbability,
      },
      headers: { [AIOPS_ANALYSIS_RUN_ORIGIN]: embeddingOrigin },
    };
  }, [
    analysisType,
    earliest,
    latest,
    http,
    searchQuery,
    dataView,
    chartWindowParameters,
    sampleProbability,
    overrides,
    embeddingOrigin,
  ]);

  useEffect(() => {
    if (shouldStart && startParams) {
      dispatch(startStream(startParams));
      setShouldStart(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldStart]);

  // On mount, fetch field candidates first. Once they are populated,
  // the actual analysis will be triggered.
  useEffect(() => {
    if (startParams) {
      dispatch(fetchFieldCandidates(startParams));
      dispatch(setCurrentAnalysisType(analysisType));
      dispatch(setCurrentAnalysisWindowParameters(chartWindowParameters));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupTableItems = useMemo(
    () => getGroupTableItems(data.significantItemsGroups),
    [data.significantItemsGroups]
  );

  const searchQueryUpdated = useMemo(() => {
    let searchQueryChanged = false;
    if (
      !isRunning &&
      previousSearchQuery.current !== undefined &&
      !isEqual(previousSearchQuery.current, searchQuery)
    ) {
      searchQueryChanged = true;
    }
    previousSearchQuery.current = searchQuery;
    return searchQueryChanged;
  }, [searchQuery, isRunning]);

  const shouldRerunAnalysis = useMemo(
    () =>
      currentAnalysisWindowParameters !== undefined &&
      !isEqual(currentAnalysisWindowParameters, chartWindowParameters),
    [currentAnalysisWindowParameters, chartWindowParameters]
  );

  const showLogRateAnalysisResultsTable = data?.significantItems.length > 0;
  const groupItemCount = groupTableItems.reduce((p, c) => {
    return p + c.groupItemsSortedByUniqueness.length;
  }, 0);
  const foundGroups = groupTableItems.length > 0 && groupItemCount > 0;

  const isAnalysisControlsDisabled = embeddingOrigin === AIOPS_EMBEDDABLE_ORIGIN.CASES;

  return (
    <div data-test-subj="aiopsLogRateAnalysisResults">
      <ProgressControls
        isBrushCleared={isBrushCleared}
        progress={data.loaded}
        progressMessage={data.loadingState ?? ''}
        isRunning={isRunning}
        onRefresh={() => startHandler(false)}
        onCancel={cancelHandler}
        onReset={onReset}
        shouldRerunAnalysis={shouldRerunAnalysis || searchQueryUpdated}
        analysisInfo={<LogRateAnalysisInfoPopover />}
        isAnalysisControlsDisabled={isAnalysisControlsDisabled}
      >
        <>
          {embeddingOrigin !== AIOPS_EMBEDDABLE_ORIGIN.DASHBOARD && (
            <LogRateAnalysisOptions foundGroups={foundGroups} />
          )}
          {embeddingOrigin === AIOPS_EMBEDDABLE_ORIGIN.DASHBOARD && (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                position="top"
                content={i18n.translate('xpack.aiops.logRateAnalysis.optionsButtonTooltip', {
                  defaultMessage:
                    'Options to customize the analysis, such as filtering fields and grouping.',
                })}
              >
                <EuiButtonIcon
                  data-test-subj="aiopsLogRateAnalysisOptionsButton"
                  iconType="controlsHorizontal"
                  onClick={onEmbeddableOptionsClickHandler}
                  aria-label={i18n.translate('xpack.aiops.logRateAnalysis.optionsButtonAriaLabel', {
                    defaultMessage: 'Analysis options',
                  })}
                />
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </>
      </ProgressControls>

      {embeddingOrigin === AIOPS_EMBEDDABLE_ORIGIN.DASHBOARD && embeddableOptionsVisible && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <LogRateAnalysisOptions foundGroups={foundGroups} growFirstItem={true} />
          </EuiFlexGroup>
        </>
      )}

      {errors.length > 0 ? (
        <>
          <EuiSpacer size="xs" />
          <EuiCallOut
            title={i18n.translate('xpack.aiops.analysis.errorCallOutTitle', {
              defaultMessage:
                'The following {errorCount, plural, one {error} other {errors}} occurred running the analysis.',
              values: { errorCount: errors.length },
            })}
            color="warning"
            iconType="warning"
            size="s"
          >
            <EuiText size="s">
              {errors.length === 1 ? (
                <p>{errors[0]}</p>
              ) : (
                <ul>
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
              {overrides !== undefined ? (
                <p>
                  <EuiButton
                    data-test-subj="aiopsLogRateAnalysisResultsTryToContinueAnalysisButton"
                    size="s"
                    onClick={() => startHandler(true)}
                  >
                    <FormattedMessage
                      id="xpack.aiops.logRateAnalysis.page.tryToContinueAnalysisButtonText"
                      defaultMessage="Try to continue analysis"
                    />
                  </EuiButton>
                </p>
              ) : null}
            </EuiText>
          </EuiCallOut>
          <EuiSpacer size="xs" />
        </>
      ) : null}
      {showLogRateAnalysisResultsTable && groupResults && foundGroups && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs">{groupResults ? groupResultsHelpMessage : undefined}</EuiText>
        </>
      )}
      <EuiSpacer size="s" />
      {!isRunning && !showLogRateAnalysisResultsTable && (
        <EuiEmptyPrompt
          data-test-subj="aiopsNoResultsFoundEmptyPrompt"
          title={
            <h2>
              <FormattedMessage
                id="xpack.aiops.logRateAnalysis.page.noResultsPromptTitle"
                defaultMessage="The analysis did not return any results."
              />
            </h2>
          }
          titleSize="xs"
          body={
            <p>
              <FormattedMessage
                id="xpack.aiops.logRateAnalysis.page.noResultsPromptBody"
                defaultMessage="Try to adjust the baseline and deviation time ranges and rerun the analysis. If you still get no results, there might be no statistically significant entities contributing to this deviation in log rate."
              />
            </p>
          }
        />
      )}
      {/* Using inline style as Eui Table overwrites overflow settings  */}
      <div
        style={
          stickyHistogram
            ? {
                height: '500px',
                overflowX: 'hidden',
                overflowY: 'auto',
                paddingTop: '20px',
              }
            : undefined
        }
      >
        {showLogRateAnalysisResultsTable && groupResults ? (
          <LogRateAnalysisResultsGroupsTable
            skippedColumns={skippedColumns}
            significantItems={data.significantItems}
            groupTableItems={groupTableItems}
            searchQuery={searchQuery}
            barColorOverride={barColorOverride}
            barHighlightColorOverride={barHighlightColorOverride}
          />
        ) : null}
        {showLogRateAnalysisResultsTable && !groupResults ? (
          <LogRateAnalysisResultsTable
            skippedColumns={skippedColumns}
            searchQuery={searchQuery}
            barColorOverride={barColorOverride}
            barHighlightColorOverride={barHighlightColorOverride}
          />
        ) : null}
      </div>
    </div>
  );
};
