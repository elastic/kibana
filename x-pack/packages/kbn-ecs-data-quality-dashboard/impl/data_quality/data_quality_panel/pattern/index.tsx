/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FlameElementEvent,
  HeatmapElementEvent,
  MetricElementEvent,
  PartitionElementEvent,
  Theme,
  WordCloudElementEvent,
  XYChartElementEvent,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { ErrorEmptyPrompt } from '../error_empty_prompt';
import {
  getIlmExplainPhaseCounts,
  getIlmPhase,
  getSummaryTableItems,
  shouldCreateIndexNames,
  shouldCreatePatternRollup,
} from './helpers';
import {
  getDocsCount,
  getIndexNames,
  getTotalDocsCount,
  getTotalPatternIncompatible,
  getTotalPatternIndicesChecked,
} from '../../helpers';
import { IndexProperties } from '../index_properties';
import { LoadingEmptyPrompt } from '../loading_empty_prompt';
import { PatternSummary } from './pattern_summary';
import { RemoteClustersCallout } from '../remote_clusters_callout';
import { SummaryTable } from '../summary_table';
import { getSummaryTableColumns } from '../summary_table/helpers';
import * as i18n from './translations';
import type { PatternRollup } from '../../types';
import { useIlmExplain } from '../../use_ilm_explain';
import { useStats } from '../../use_stats';

const IndexPropertiesContainer = styled.div`
  margin-bottom: ${euiThemeVars.euiSizeS};
  width: 100%;
`;

const EMPTY_INDEX_NAMES: string[] = [];

interface Props {
  addSuccessToast: (toast: { title: string }) => void;
  canUserCreateAndReadCases: () => boolean;
  defaultNumberFormat: string;
  getGroupByFieldsOnClick: (
    elements: Array<
      | FlameElementEvent
      | HeatmapElementEvent
      | MetricElementEvent
      | PartitionElementEvent
      | WordCloudElementEvent
      | XYChartElementEvent
    >
  ) => {
    groupByField0: string;
    groupByField1: string;
  };
  ilmPhases: string[];
  indexNames: string[] | undefined;
  openCreateCaseFlyout: ({
    comments,
    headerContent,
  }: {
    comments: string[];
    headerContent?: React.ReactNode;
  }) => void;
  pattern: string;
  patternRollup: PatternRollup | undefined;
  theme: Theme;
  updatePatternIndexNames: ({
    indexNames,
    pattern,
  }: {
    indexNames: string[];
    pattern: string;
  }) => void;
  updatePatternRollup: (patternRollup: PatternRollup) => void;
}

const PatternComponent: React.FC<Props> = ({
  addSuccessToast,
  canUserCreateAndReadCases,
  defaultNumberFormat,
  getGroupByFieldsOnClick,
  indexNames,
  ilmPhases,
  openCreateCaseFlyout,
  pattern,
  patternRollup,
  theme,
  updatePatternIndexNames,
  updatePatternRollup,
}) => {
  const { error: statsError, loading: loadingStats, stats } = useStats(pattern);
  const { error: ilmExplainError, loading: loadingIlmExplain, ilmExplain } = useIlmExplain(pattern);

  const loading = useMemo(
    () => loadingStats || loadingIlmExplain,
    [loadingIlmExplain, loadingStats]
  );
  const error = useMemo(() => statsError ?? ilmExplainError, [ilmExplainError, statsError]);

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<
    Record<string, React.ReactNode>
  >({});

  const toggleExpanded = useCallback(
    (indexName: string) => {
      if (itemIdToExpandedRowMap[indexName]) {
        setItemIdToExpandedRowMap({});
      } else {
        setItemIdToExpandedRowMap({
          [indexName]: (
            <IndexPropertiesContainer>
              <IndexProperties
                addSuccessToast={addSuccessToast}
                canUserCreateAndReadCases={canUserCreateAndReadCases}
                defaultNumberFormat={defaultNumberFormat}
                docsCount={getDocsCount({ stats, indexName })}
                getGroupByFieldsOnClick={getGroupByFieldsOnClick}
                ilmPhase={ilmExplain != null ? getIlmPhase(ilmExplain[indexName]) : undefined}
                indexName={indexName}
                openCreateCaseFlyout={openCreateCaseFlyout}
                pattern={pattern}
                patternRollup={patternRollup}
                theme={theme}
                updatePatternRollup={updatePatternRollup}
              />
            </IndexPropertiesContainer>
          ),
        });
      }
    },
    [
      addSuccessToast,
      canUserCreateAndReadCases,
      defaultNumberFormat,
      getGroupByFieldsOnClick,
      ilmExplain,
      itemIdToExpandedRowMap,
      openCreateCaseFlyout,
      pattern,
      patternRollup,
      stats,
      theme,
      updatePatternRollup,
    ]
  );

  const ilmExplainPhaseCounts = useMemo(() => getIlmExplainPhaseCounts(ilmExplain), [ilmExplain]);

  const items = useMemo(
    () =>
      getSummaryTableItems({
        ilmExplain,
        indexNames: indexNames ?? EMPTY_INDEX_NAMES,
        pattern,
        patternDocsCount: patternRollup?.docsCount ?? 0,
        results: patternRollup?.results,
        stats,
      }),
    [ilmExplain, indexNames, pattern, patternRollup, stats]
  );

  useEffect(() => {
    if (shouldCreateIndexNames({ indexNames, stats, ilmExplain })) {
      updatePatternIndexNames({
        indexNames: getIndexNames({ stats, ilmExplain, ilmPhases }),
        pattern,
      });
    }

    if (shouldCreatePatternRollup({ error, patternRollup, stats, ilmExplain })) {
      updatePatternRollup({
        docsCount: getTotalDocsCount({
          indexNames: getIndexNames({ stats, ilmExplain, ilmPhases }),
          stats,
        }),
        error,
        ilmExplain,
        ilmExplainPhaseCounts,
        indices: getIndexNames({ stats, ilmExplain, ilmPhases }).length,
        pattern,
        results: undefined,
        stats,
      });
    }
  }, [
    error,
    ilmExplain,
    ilmExplainPhaseCounts,
    ilmPhases,
    indexNames,
    pattern,
    patternRollup,
    stats,
    updatePatternIndexNames,
    updatePatternRollup,
  ]);

  return (
    <EuiPanel hasBorder={false} hasShadow={false}>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem grow={false}>
          <PatternSummary
            defaultNumberFormat={defaultNumberFormat}
            incompatible={getTotalPatternIncompatible(patternRollup?.results)}
            indices={indexNames?.length}
            indicesChecked={getTotalPatternIndicesChecked(patternRollup)}
            ilmExplainPhaseCounts={ilmExplainPhaseCounts}
            pattern={pattern}
            patternDocsCount={patternRollup?.docsCount ?? 0}
          />
          <EuiSpacer />
        </EuiFlexItem>

        {!loading && pattern.includes(':') && (
          <>
            <RemoteClustersCallout />
            <EuiSpacer size="s" />
          </>
        )}

        {!loading && error != null && (
          <ErrorEmptyPrompt title={i18n.ERROR_LOADING_METADATA_TITLE(pattern)} />
        )}

        {loading && <LoadingEmptyPrompt loading={i18n.LOADING_STATS} />}

        {!loading && error == null && (
          <SummaryTable
            defaultNumberFormat={defaultNumberFormat}
            getTableColumns={getSummaryTableColumns}
            itemIdToExpandedRowMap={itemIdToExpandedRowMap}
            items={items}
            toggleExpanded={toggleExpanded}
          />
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

PatternComponent.displayName = 'PatternComponent';

export const Pattern = React.memo(PatternComponent);
