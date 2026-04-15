/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  EuiBasicTable,
  EuiBadge,
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { useHistory, useLocation } from 'react-router-dom';
import type { PairedTTestResult } from '@kbn/evals-common';
import { useCompareRuns, useEvaluationRun, useRunDatasetExamples } from '../../hooks/use_evals_api';
import * as i18n from './translations';

const SIGNIFICANCE_THRESHOLD = 0.05;

interface ExampleScorePair {
  exampleId: string;
  exampleIndex: number | null;
  evaluatorName: string;
  scoreA: number | null | undefined;
  scoreB: number | null | undefined;
}

const formatScore = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  return value.toFixed(3);
};

const formatPValue = (value: number | null): string => {
  if (value === null || !Number.isFinite(value)) return '-';
  if (value < 0.001) return '< 0.001';
  return value.toFixed(3);
};

const formatDiff = (value: number): string => {
  if (!Number.isFinite(value)) return '-';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(3)}`;
};

const SignificanceBadge: React.FC<{ pValue: number | null; diff: number }> = ({ pValue, diff }) => {
  if (pValue === null) {
    return <EuiBadge color="hollow">{i18n.BADGE_INSUFFICIENT_DATA}</EuiBadge>;
  }
  if (pValue >= SIGNIFICANCE_THRESHOLD) {
    return <EuiBadge color="hollow">{i18n.BADGE_NOT_SIGNIFICANT}</EuiBadge>;
  }
  const color = diff > 0 ? 'success' : 'danger';
  return <EuiBadge color={color}>{i18n.BADGE_SIGNIFICANT}</EuiBadge>;
};

const DiffValue: React.FC<{ diff: number }> = ({ diff }) => {
  const { euiTheme } = useEuiTheme();
  if (!Number.isFinite(diff)) return <span>-</span>;

  let color: string | undefined;
  if (diff > 0) color = euiTheme.colors.textSuccess;
  else if (diff < 0) color = euiTheme.colors.textDanger;

  return (
    <span style={{ color, fontWeight: diff !== 0 ? 600 : undefined }}>{formatDiff(diff)}</span>
  );
};

const RunHeader: React.FC<{
  label: string;
  runId: string;
}> = ({ label, runId }) => {
  const { data: runData, isLoading } = useEvaluationRun(runId);

  const branch = runData?.git_branch;
  const timestamp = runData?.timestamp;
  const taskModel = runData?.task_model?.id;
  const evaluatorModel = runData?.evaluator_model?.id;

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={runId}>
            <EuiTitle size="xs">
              <h3 tabIndex={0}>{label}</h3>
            </EuiTitle>
          </EuiToolTip>
        </EuiFlexItem>
        {branch && (
          <EuiFlexItem grow={false}>
            <EuiText size="s">{branch}</EuiText>
          </EuiFlexItem>
        )}
        {timestamp && (
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {new Date(timestamp).toLocaleString()}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {isLoading ? (
        <>
          <EuiSpacer size="s" />
          <EuiLoadingSpinner size="s" />
        </>
      ) : (
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          responsive={false}
          wrap
          css={{ marginTop: 6 }}
        >
          {taskModel && (
            <>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <strong>{i18n.STAT_TASK_MODEL}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="primary">{taskModel}</EuiBadge>
              </EuiFlexItem>
            </>
          )}
          {evaluatorModel && (
            <>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <strong>{i18n.STAT_EVALUATOR_MODEL}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="accent">{evaluatorModel}</EuiBadge>
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};

const ExampleDrilldownFlyout: React.FC<{
  runIdA: string;
  runIdB: string;
  datasetId: string;
  datasetName: string;
  evaluatorName: string;
  onClose: () => void;
}> = ({ runIdA, runIdB, datasetId, datasetName, evaluatorName, onClose }) => {
  const { euiTheme } = useEuiTheme();
  const { data: examplesA, isLoading: loadingA } = useRunDatasetExamples(runIdA, datasetId);
  const { data: examplesB, isLoading: loadingB } = useRunDatasetExamples(runIdB, datasetId);

  const pairs: ExampleScorePair[] = useMemo(() => {
    if (!examplesA?.examples || !examplesB?.examples) return [];

    const mapB = new Map<string, Map<string, number | null | undefined>>();
    for (const ex of examplesB.examples) {
      const evaluatorScores = new Map<string, number | null | undefined>();
      for (const score of ex.scores) {
        evaluatorScores.set(score.evaluator.name, score.evaluator.score);
      }
      mapB.set(ex.example_id, evaluatorScores);
    }

    const result: ExampleScorePair[] = [];
    for (const ex of examplesA.examples) {
      const bScores = mapB.get(ex.example_id);
      for (const score of ex.scores) {
        if (score.evaluator.name !== evaluatorName) continue;
        result.push({
          exampleId: ex.example_id,
          exampleIndex: ex.example_index,
          evaluatorName: score.evaluator.name,
          scoreA: score.evaluator.score,
          scoreB: bScores?.get(score.evaluator.name) ?? null,
        });
      }
    }

    return result.sort((a, b) => (a.exampleIndex ?? 0) - (b.exampleIndex ?? 0));
  }, [examplesA, examplesB, evaluatorName]);

  const isLoading = loadingA || loadingB;

  const flyoutColumns: Array<EuiBasicTableColumn<ExampleScorePair>> = useMemo(
    () => [
      {
        field: 'exampleId',
        name: i18n.FLYOUT_COLUMN_EXAMPLE,
        render: (_id: string, item: ExampleScorePair) => {
          const isNumericFallback = /^\d+$/.test(item.exampleId);
          return isNumericFallback ? `#${item.exampleId}` : item.exampleId;
        },
      },
      {
        field: 'scoreA',
        name: i18n.FLYOUT_COLUMN_SCORE_A,
        align: 'right' as const,
        render: (val: number | null | undefined) => formatScore(val),
      },
      {
        field: 'scoreB',
        name: i18n.FLYOUT_COLUMN_SCORE_B,
        align: 'right' as const,
        render: (val: number | null | undefined) => formatScore(val),
      },
      {
        name: i18n.FLYOUT_COLUMN_DIFF,
        align: 'right' as const,
        render: (item: ExampleScorePair) => {
          if (
            item.scoreA === null ||
            item.scoreA === undefined ||
            item.scoreB === null ||
            item.scoreB === undefined
          ) {
            return '-';
          }
          const diff = item.scoreA - item.scoreB;
          return <DiffValue diff={diff} />;
        },
      },
    ],
    []
  );

  return (
    <EuiFlyout onClose={onClose} size="m" ownFocus aria-label={i18n.FLYOUT_TITLE}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{i18n.FLYOUT_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiBadge>{datasetName}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{evaluatorName}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {!isLoading && pairs.length === 0 ? (
          <EuiEmptyPrompt
            iconType="search"
            title={<h3>{i18n.FLYOUT_NO_EXAMPLES_TITLE}</h3>}
            body={<p>{i18n.FLYOUT_NO_EXAMPLES_BODY}</p>}
          />
        ) : (
          <EuiBasicTable<ExampleScorePair>
            tableCaption={i18n.FLYOUT_TABLE_CAPTION}
            items={pairs}
            columns={flyoutColumns}
            loading={isLoading}
            tableLayout="auto"
            rowProps={(item) => {
              if (
                item.scoreA !== null &&
                item.scoreA !== undefined &&
                item.scoreB !== null &&
                item.scoreB !== undefined
              ) {
                const diff = item.scoreA - item.scoreB;
                if (diff < 0) {
                  return {
                    style: { backgroundColor: `${euiTheme.colors.backgroundFilledDanger}15` },
                  };
                }
                if (diff > 0) {
                  return {
                    style: { backgroundColor: `${euiTheme.colors.backgroundFilledSuccess}15` },
                  };
                }
              }
              return {};
            }}
          />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

const clickableRowClass = css`
  cursor: pointer;
  &:hover {
    text-decoration: none;
    filter: brightness(0.97);
  }
`;

export const CompareRunsPage: React.FC = () => {
  const history = useHistory();
  const { search } = useLocation();
  const { euiTheme } = useEuiTheme();

  const params = useMemo(() => new URLSearchParams(search), [search]);
  const runIdA = params.get('runA') ?? '';
  const runIdB = params.get('runB') ?? '';

  const { data, isLoading, error, refetch } = useCompareRuns(runIdA, runIdB);

  const [flyoutState, setFlyoutState] = useState<{
    datasetId: string;
    datasetName: string;
    evaluatorName: string;
  } | null>(null);

  const handleRowClick = useCallback((result: PairedTTestResult) => {
    setFlyoutState({
      datasetId: result.datasetId,
      datasetName: result.datasetName,
      evaluatorName: result.evaluatorName,
    });
  }, []);

  const significantCount = useMemo(
    () =>
      (data?.results ?? []).filter((r) => r.pValue !== null && r.pValue < SIGNIFICANCE_THRESHOLD)
        .length,
    [data?.results]
  );

  const columns: Array<EuiBasicTableColumn<PairedTTestResult>> = useMemo(
    () => [
      {
        field: 'datasetName',
        name: i18n.COLUMN_DATASET,
        sortable: true,
      },
      {
        field: 'evaluatorName',
        name: i18n.COLUMN_EVALUATOR,
        sortable: true,
      },
      {
        field: 'sampleSize',
        name: i18n.COLUMN_SAMPLE_SIZE,
        sortable: true,
        width: '60px',
        align: 'right' as const,
      },
      {
        field: 'meanA',
        name: i18n.COLUMN_MEAN_A,
        sortable: true,
        render: (val: number) => formatScore(val),
        align: 'right' as const,
      },
      {
        field: 'meanB',
        name: i18n.COLUMN_MEAN_B,
        sortable: true,
        render: (val: number) => formatScore(val),
        align: 'right' as const,
      },
      {
        name: i18n.COLUMN_DIFF,
        sortable: (item: PairedTTestResult) => item.meanA - item.meanB,
        render: (item: PairedTTestResult) => <DiffValue diff={item.meanA - item.meanB} />,
        align: 'right' as const,
      },
      {
        field: 'pValue',
        name: i18n.COLUMN_P_VALUE,
        sortable: true,
        render: (val: number | null) => formatPValue(val),
        align: 'right' as const,
      },
      {
        name: i18n.COLUMN_SIGNIFICANCE,
        render: (item: PairedTTestResult) => (
          <SignificanceBadge pValue={item.pValue} diff={item.meanA - item.meanB} />
        ),
      },
    ],
    []
  );

  if (!runIdA || !runIdB) {
    return (
      <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
        <EuiEmptyPrompt
          iconType="compareArrows"
          title={<h2>{i18n.MISSING_RUN_IDS_TITLE}</h2>}
          body={<p>{i18n.MISSING_RUN_IDS_BODY}</p>}
          actions={[<EuiButton onClick={() => history.push('/')}>{i18n.BACK_TO_RUNS}</EuiButton>]}
        />
      </EuiPageSection>
    );
  }

  return (
    <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
      <EuiTitle size="l">
        <h2>{i18n.PAGE_TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="l" />

      <EuiFlexGroup gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <RunHeader label={i18n.RUN_A_LABEL} runId={runIdA} />
        </EuiFlexItem>
        <EuiFlexItem>
          <RunHeader label={i18n.RUN_B_LABEL} runId={runIdB} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      {isLoading && <EuiLoadingSpinner size="xl" />}

      {error ? (
        <EuiEmptyPrompt
          color="danger"
          iconType="warning"
          title={<h2>{i18n.ERROR_TITLE}</h2>}
          body={<p>{i18n.getErrorBody(String(error))}</p>}
          actions={[
            <EuiButton onClick={() => refetch()} iconType="refresh">
              {i18n.RETRY_BUTTON}
            </EuiButton>,
          ]}
        />
      ) : null}

      {data && !isLoading && (
        <>
          {data.pairing.totalPairs > 0 && (
            <EuiFlexGroup wrap>
              <EuiFlexItem>
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiStat
                    title={data.pairing.totalPairs}
                    description={i18n.SUMMARY_PAIRS}
                    titleSize="xs"
                    isLoading={false}
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiStat
                    title={data.pairing.skippedMissingPairs}
                    description={i18n.SUMMARY_SKIPPED_MISSING}
                    titleSize="xs"
                    isLoading={false}
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiStat
                    title={data.pairing.skippedNullScores}
                    description={i18n.SUMMARY_SKIPPED_NULL}
                    titleSize="xs"
                    isLoading={false}
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiStat
                    title={`${significantCount}/${data.results.length}`}
                    description={i18n.SUMMARY_SIGNIFICANT_DIFFS}
                    titleSize="xs"
                    isLoading={false}
                  />
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}

          <EuiSpacer size="l" />

          {data.results.length === 0 ? (
            <EuiEmptyPrompt
              iconType="search"
              title={<h3>{i18n.NO_RESULTS_TITLE}</h3>}
              body={<p>{i18n.NO_RESULTS_BODY}</p>}
              actions={[
                <EuiButton onClick={() => history.push('/')}>{i18n.BACK_TO_RUNS}</EuiButton>,
              ]}
            />
          ) : (
            <>
              <EuiText size="s" color="subdued">
                <p>{i18n.CLICK_ROW_HINT}</p>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiBasicTable<PairedTTestResult>
                tableCaption={i18n.TABLE_CAPTION}
                items={data.results}
                columns={columns}
                rowProps={(item) => ({
                  onClick: () => handleRowClick(item),
                  className: clickableRowClass,
                })}
              />
            </>
          )}
        </>
      )}

      {flyoutState && (
        <ExampleDrilldownFlyout
          runIdA={runIdA}
          runIdB={runIdB}
          datasetId={flyoutState.datasetId}
          datasetName={flyoutState.datasetName}
          evaluatorName={flyoutState.evaluatorName}
          onClose={() => setFlyoutState(null)}
        />
      )}
    </EuiPageSection>
  );
};
