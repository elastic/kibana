/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IlmExplainLifecycleLifecycleExplain } from '@elastic/elasticsearch/lib/api/types';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';

import { useIndicesCheckContext } from '../../../../contexts/indices_check_context';

import { MeteringStatsIndex, PatternRollup } from '../../../../types';
import { useDataQualityContext } from '../../../../data_quality_context';
import { IndexResultBadge } from '../index_result_badge';
import { useCurrentWindowWidth } from './hooks/use_current_window_width';
import { CHECK_NOW, HISTORY, LATEST_CHECK } from './translations';
import { LatestResults } from './latest_results';
import { HistoricalResults } from './historical_results';
import { HistoricalResultsContext } from './contexts/historical_results_context';
import { useHistoricalResults } from './hooks/use_historical_results';
import { getFormattedCheckTime } from './utils/get_formatted_check_time';

export interface Props {
  ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> | null;
  indexName: string;
  pattern: string;
  patternRollup: PatternRollup | undefined;
  stats: Record<string, MeteringStatsIndex> | null;
  onClose: () => void;
}

const tabs = [
  {
    id: LATEST_CHECK,
    name: LATEST_CHECK,
  },
  {
    id: HISTORY,
    name: HISTORY,
  },
];

export const IndexCheckFlyoutComponent: React.FC<Props> = ({
  ilmExplain,
  indexName,
  pattern,
  patternRollup,
  stats,
  onClose,
}) => {
  const { historicalResultsState, fetchHistoricalResults } = useHistoricalResults();
  const currentWindowWidth = useCurrentWindowWidth();
  const isLargeScreen = currentWindowWidth > 1720;
  const isMediumScreen = currentWindowWidth > 1200;
  const { httpFetch, formatBytes, formatNumber } = useDataQualityContext();
  const { checkState, checkIndex } = useIndicesCheckContext();
  const indexCheckState = checkState[indexName];
  const isChecking = indexCheckState?.isChecking ?? false;
  const partitionedFieldMetadata = indexCheckState?.partitionedFieldMetadata ?? null;
  const indexResult = patternRollup?.results?.[indexName];
  const indexCheckFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'indexCheckFlyoutTitle',
  });
  const [selectedTabId, setSelectedTabId] = useState(LATEST_CHECK);
  const checkIndexAbortControllerRef = useRef(new AbortController());
  const fetchHistoricalResultsAbortControllerRef = useRef(new AbortController());

  const handleCheckNow = useCallback(() => {
    checkIndex({
      abortController: checkIndexAbortControllerRef.current,
      indexName,
      pattern,
      httpFetch,
      formatBytes,
      formatNumber,
    });
  }, [checkIndex, formatBytes, formatNumber, httpFetch, indexName, pattern]);

  useEffect(() => {
    const checkIndexAbortController = checkIndexAbortControllerRef.current;
    const fetchHistoricalResultsAbortController = fetchHistoricalResultsAbortControllerRef.current;
    return () => {
      checkIndexAbortController.abort();
      fetchHistoricalResultsAbortController.abort();
    };
  }, []);

  const renderTabs = useMemo(
    () =>
      tabs.map((tab, index) => (
        <EuiTab
          onClick={() => {
            fetchHistoricalResults({
              abortController: fetchHistoricalResultsAbortControllerRef.current,
              indexName,
            });
            setSelectedTabId(tab.id);
          }}
          isSelected={tab.id === selectedTabId}
          key={index}
        >
          {tab.name}
        </EuiTab>
      )),
    [fetchHistoricalResults, indexName, selectedTabId]
  );

  return (
    <div data-test-subj="indexCheckFlyout">
      <EuiFlyout
        size={isLargeScreen ? '50%' : isMediumScreen ? '70%' : '90%'}
        ownFocus
        onClose={onClose}
        aria-labelledby={indexCheckFlyoutTitleId}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <EuiFlexGroup alignItems={'center'}>
              {partitionedFieldMetadata?.incompatible != null && (
                <IndexResultBadge incompatible={partitionedFieldMetadata.incompatible.length} />
              )}
              <h2 id={indexCheckFlyoutTitleId}>{indexName}</h2>
            </EuiFlexGroup>
          </EuiTitle>
          {indexResult != null && indexResult.checkedAt != null && (
            <>
              <EuiSpacer size="xs" />
              <EuiText size="s" data-test-subj="latestCheckedAt">
                {getFormattedCheckTime(indexResult.checkedAt)}
              </EuiText>
            </>
          )}
          <EuiSpacer />
          <EuiTabs style={{ marginBottom: '-25px' }}>{renderTabs}</EuiTabs>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <HistoricalResultsContext.Provider
            value={{
              fetchHistoricalResults,
              historicalResultsState,
            }}
          >
            {selectedTabId === LATEST_CHECK ? (
              <LatestResults
                indexName={indexName}
                stats={stats}
                ilmExplain={ilmExplain}
                pattern={pattern}
                patternRollup={patternRollup}
              />
            ) : (
              <HistoricalResults indexName={indexName} />
            )}
          </HistoricalResultsContext.Provider>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton iconType="refresh" isLoading={isChecking} onClick={handleCheckNow} fill>
                {CHECK_NOW}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </div>
  );
};

IndexCheckFlyoutComponent.displayName = 'IndexCheckFlyoutComponent';

export const IndexCheckFlyout = React.memo(IndexCheckFlyoutComponent);
