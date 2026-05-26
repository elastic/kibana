/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  EuiBasicTable,
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiCallOut,
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
import { TraceWaterfall, useTraceSpans } from '@kbn/llm-trace-waterfall';
import type { PairedTTestResult } from '@kbn/evals-common';
import {
  useCompareRuns,
  useEvalsTraceFetcher,
  useEvaluationRun,
  useRunDatasetExamples,
} from '../../hooks/use_evals_api';
import * as i18n from './translations';

const SIGNIFICANCE_THRESHOLD = 0.05;
const ROW_HIGHLIGHT_ALPHA = 0.08;

/**
 * Convert a hex color (#RRGGBB) to an rgba string with the given alpha.
 * Falls back to transparent if the input is not a valid hex color.
 */
const hexToRgba = (hex: string, alpha: number): string => {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return 'transparent';
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface ExampleScorePair {
  exampleId: string;
  exampleIndex: number | null;
  evaluatorName: string;
  repetitionIndex: number;
  scoreA: number | null | undefined;
  scoreB: number | null | undefined;
  traceIdA: string | null;
  traceIdB: string | null;
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

const LOWER_IS_BETTER_PATTERN = /\b(tokens?|latency|costs?|duration|time|errors?)\b/i;

const isLowerBetter = (evaluatorName: string): boolean =>
  LOWER_IS_BETTER_PATTERN.test(evaluatorName);

const isImproved = (diff: number, evaluatorName: string): boolean =>
  isLowerBetter(evaluatorName) ? diff < 0 : diff > 0;

const SignificanceBadge: React.FC<{
  pValue: number | null;
  diff: number;
  evaluatorName: string;
}> = ({ pValue, diff, evaluatorName }) => {
  if (pValue === null || !Number.isFinite(pValue)) {
    return <EuiBadge color="hollow">{i18n.BADGE_INSUFFICIENT_DATA}</EuiBadge>;
  }
  if (pValue >= SIGNIFICANCE_THRESHOLD) {
    return <EuiBadge color="hollow">{i18n.BADGE_NOT_SIGNIFICANT}</EuiBadge>;
  }
  const color = isImproved(diff, evaluatorName) ? 'success' : 'danger';
  return <EuiBadge color={color}>{i18n.BADGE_SIGNIFICANT}</EuiBadge>;
};

const DiffValue: React.FC<{ diff: number; evaluatorName: string }> = ({ diff, evaluatorName }) => {
  const { euiTheme } = useEuiTheme();
  if (!Number.isFinite(diff)) return <span>-</span>;

  const lowerBetter = isLowerBetter(evaluatorName);
  const improved = isImproved(diff, evaluatorName);
  let color: string | undefined;
  if (diff !== 0) {
    color = improved ? euiTheme.colors.textSuccess : euiTheme.colors.textDanger;
  }

  const directionHint = lowerBetter ? i18n.DIFF_LOWER_IS_BETTER : i18n.DIFF_HIGHER_IS_BETTER;
  const verdictHint = diff === 0 ? null : improved ? i18n.DIFF_IMPROVED : i18n.DIFF_REGRESSED;
  const tooltip = verdictHint ? `${verdictHint} · ${directionHint}` : directionHint;

  return (
    <EuiToolTip content={tooltip}>
      <span tabIndex={0} style={{ color, fontWeight: diff !== 0 ? 600 : undefined }}>
        {formatDiff(diff)}
      </span>
    </EuiToolTip>
  );
};

const RunHeader: React.FC<{
  label: string;
  runId: string;
  isNewer?: boolean;
}> = ({ label, runId, isNewer }) => {
  const history = useHistory();
  const { data: runData, isLoading } = useEvaluationRun(runId);

  const branch = runData?.git_branch;
  const timestamp = runData?.timestamp;
  const taskModel = runData?.task_model?.id;
  const evaluatorModel = runData?.evaluator_model?.id;

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{label}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {isNewer !== undefined && (
          <EuiFlexItem grow>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="none" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiBadge color={isNewer ? 'success' : 'default'}>
                  {isNewer ? i18n.BADGE_NEWER : i18n.BADGE_OLDER}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={i18n.VIEW_RUN_DETAIL}>
            <EuiLink onClick={() => history.push(`/runs/${encodeURIComponent(runId)}`)}>
              {runId}
            </EuiLink>
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
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const fetchTrace = useEvalsTraceFetcher();
  const {
    spans,
    durationMs,
    isLoading: traceLoading,
    error: traceError,
  } = useTraceSpans(selectedTraceId, { fetchTrace });
  const { data: examplesA, isLoading: loadingA } = useRunDatasetExamples(runIdA, datasetId);
  const { data: examplesB, isLoading: loadingB } = useRunDatasetExamples(runIdB, datasetId);

  const pairs: ExampleScorePair[] = useMemo(() => {
    if (!examplesA?.examples || !examplesB?.examples) return [];

    interface BScoreEntry {
      score: number | null | undefined;
      traceId: string | null;
    }
    const mapB = new Map<string, Map<string, BScoreEntry>>();
    for (const ex of examplesB.examples) {
      const scoresByKey = new Map<string, BScoreEntry>();
      for (const score of ex.scores) {
        const key = `${score.evaluator.name}|${score.task.repetition_index}`;
        scoresByKey.set(key, {
          score: score.evaluator.score,
          traceId: score.task.trace_id ?? null,
        });
      }
      mapB.set(ex.example_id, scoresByKey);
    }

    const result: ExampleScorePair[] = [];
    const coveredBExamples = new Set<string>();

    for (const ex of examplesA.examples) {
      const bScores = mapB.get(ex.example_id);
      for (const score of ex.scores) {
        if (score.evaluator.name !== evaluatorName) continue;
        coveredBExamples.add(ex.example_id);
        const key = `${score.evaluator.name}|${score.task.repetition_index}`;
        const bEntry = bScores?.get(key);
        result.push({
          exampleId: ex.example_id,
          exampleIndex: ex.example_index,
          evaluatorName: score.evaluator.name,
          repetitionIndex: score.task.repetition_index,
          scoreA: score.evaluator.score,
          scoreB: bEntry?.score ?? null,
          traceIdA: score.task.trace_id ?? null,
          traceIdB: bEntry?.traceId ?? null,
        });
      }
    }

    for (const ex of examplesB.examples) {
      if (coveredBExamples.has(ex.example_id)) continue;
      for (const score of ex.scores) {
        if (score.evaluator.name !== evaluatorName) continue;
        result.push({
          exampleId: ex.example_id,
          exampleIndex: ex.example_index,
          evaluatorName: score.evaluator.name,
          repetitionIndex: score.task.repetition_index,
          scoreA: null,
          scoreB: score.evaluator.score,
          traceIdA: null,
          traceIdB: score.task.trace_id ?? null,
        });
      }
    }

    return result.sort((a, b) => {
      const indexDiff = (a.exampleIndex ?? 0) - (b.exampleIndex ?? 0);
      if (indexDiff !== 0) return indexDiff;
      return a.repetitionIndex - b.repetitionIndex;
    });
  }, [examplesA, examplesB, evaluatorName]);

  const isLoading = loadingA || loadingB;
  const hasRepetitions = useMemo(() => pairs.some((p) => p.repetitionIndex > 0), [pairs]);

  const flyoutColumns: Array<EuiBasicTableColumn<ExampleScorePair>> = useMemo(
    () => [
      {
        field: 'exampleId',
        name: i18n.FLYOUT_COLUMN_EXAMPLE,
        render: (_id: string, item: ExampleScorePair) => {
          const isNumericFallback = /^\d+$/.test(item.exampleId);
          const baseLabel = isNumericFallback ? `#${item.exampleId}` : item.exampleId;
          const label = hasRepetitions
            ? `${baseLabel} (rep ${item.repetitionIndex + 1})`
            : baseLabel;
          const isPaired =
            item.scoreA != null &&
            item.scoreB != null &&
            Number.isFinite(item.scoreA) &&
            Number.isFinite(item.scoreB);
          if (!isPaired) {
            return (
              <EuiToolTip content={i18n.FLYOUT_UNPAIRED_HINT}>
                <span tabIndex={0}>{label}</span>
              </EuiToolTip>
            );
          }
          return label;
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
          return <DiffValue diff={diff} evaluatorName={item.evaluatorName} />;
        },
      },
      {
        name: i18n.FLYOUT_COLUMN_TRACES,
        width: '80px',
        align: 'center' as const,
        render: (item: ExampleScorePair) => (
          <EuiFlexGroup gutterSize="xs" responsive={false} justifyContent="center">
            {item.traceIdA && (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.FLYOUT_TRACE_A} disableScreenReaderOutput>
                  <EuiButtonIcon
                    size="xs"
                    iconType="apmTrace"
                    color="primary"
                    aria-label={i18n.FLYOUT_TRACE_A}
                    onClick={() => setSelectedTraceId(item.traceIdA)}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
            {item.traceIdB && (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.FLYOUT_TRACE_B} disableScreenReaderOutput>
                  <EuiButtonIcon
                    size="xs"
                    iconType="apmTrace"
                    color="accent"
                    aria-label={i18n.FLYOUT_TRACE_B}
                    onClick={() => setSelectedTraceId(item.traceIdB)}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
      },
    ],
    [hasRepetitions]
  );

  return (
    <>
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
                const isPaired =
                  item.scoreA != null &&
                  item.scoreB != null &&
                  Number.isFinite(item.scoreA) &&
                  Number.isFinite(item.scoreB);

                if (!isPaired) {
                  return { style: { opacity: 0.55 } };
                }

                const diff = item.scoreA! - item.scoreB!;
                if (diff === 0) return {};
                if (isImproved(diff, item.evaluatorName)) {
                  return {
                    style: {
                      backgroundColor: hexToRgba(
                        euiTheme.colors.backgroundFilledSuccess,
                        ROW_HIGHLIGHT_ALPHA
                      ),
                    },
                  };
                }
                return {
                  style: {
                    backgroundColor: hexToRgba(
                      euiTheme.colors.backgroundFilledDanger,
                      ROW_HIGHLIGHT_ALPHA
                    ),
                  },
                };
              }}
            />
          )}
        </EuiFlyoutBody>
      </EuiFlyout>
      {selectedTraceId && (
        <EuiFlyout
          onClose={() => setSelectedTraceId(null)}
          size="l"
          ownFocus
          aria-label={i18n.FLYOUT_TRACE_TITLE}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>{i18n.FLYOUT_TRACE_TITLE}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <TraceWaterfall
              spans={spans}
              traceId={selectedTraceId}
              durationMs={durationMs}
              isLoading={traceLoading}
              error={traceError}
            />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
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
  const { data: runDataA } = useEvaluationRun(runIdA);
  const { data: runDataB } = useEvaluationRun(runIdB);

  const isNewerA = useMemo(() => {
    if (!runDataA?.timestamp || !runDataB?.timestamp) return undefined;
    const tsA = new Date(runDataA.timestamp).getTime();
    const tsB = new Date(runDataB.timestamp).getTime();
    if (tsA === tsB) return undefined;
    return tsA > tsB;
  }, [runDataA?.timestamp, runDataB?.timestamp]);

  const [flyoutState, setFlyoutState] = useState<{
    datasetId: string;
    datasetName: string;
    evaluatorName: string;
  } | null>(null);

  const [sortField, setSortField] = useState<keyof PairedTTestResult>('datasetName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  const [csvCopyState, setCsvCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const csvTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(csvTimerRef.current), []);

  const sortedResults = useMemo(() => {
    const results = [...(data?.results ?? [])];
    const dir = sortDirection === 'asc' ? 1 : -1;

    results.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      let cmp: number;
      if (typeof valA === 'string' && typeof valB === 'string') {
        cmp = valA.localeCompare(valB);
      } else {
        cmp = (valA as number) - (valB as number);
      }

      if (cmp !== 0) return cmp * dir;

      if (sortField === 'datasetName') {
        return a.evaluatorName.localeCompare(b.evaluatorName);
      }
      return 0;
    });
    return results;
  }, [data?.results, sortField, sortDirection]);

  const handleCsvExport = useCallback(() => {
    if (!sortedResults.length) return;
    const header = [
      'Dataset',
      'Evaluator',
      'N',
      'Mean A',
      'Mean B',
      'Diff',
      'p-value',
      'Significant',
    ];
    const rows = sortedResults.map((r) => {
      const diff = r.meanA - r.meanB;
      return [
        `"${r.datasetName.replace(/"/g, '""')}"`,
        `"${r.evaluatorName.replace(/"/g, '""')}"`,
        r.sampleSize,
        r.meanA.toFixed(4),
        r.meanB.toFixed(4),
        diff.toFixed(4),
        r.pValue?.toFixed(6) ?? '',
        r.pValue !== null && r.pValue < SIGNIFICANCE_THRESHOLD ? 'Yes' : 'No',
      ];
    });
    const csv = [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
    navigator.clipboard.writeText(csv).then(
      () => {
        setCsvCopyState('copied');
        csvTimerRef.current = setTimeout(() => setCsvCopyState('idle'), 2000);
      },
      () => {
        setCsvCopyState('failed');
        csvTimerRef.current = setTimeout(() => setCsvCopyState('idle'), 2000);
      }
    );
  }, [sortedResults]);

  const firstRowByDataset = useMemo(() => {
    const seen = new Set<string>();
    const firstRows = new Set<PairedTTestResult>();
    for (const item of sortedResults) {
      if (!seen.has(item.datasetId)) {
        firstRows.add(item);
        seen.add(item.datasetId);
      }
    }
    return firstRows;
  }, [sortedResults]);

  const isGroupedByDataset = sortField === 'datasetName';

  const columns: Array<EuiBasicTableColumn<PairedTTestResult>> = useMemo(
    () => [
      {
        field: 'datasetName',
        name: i18n.COLUMN_DATASET,
        sortable: true,
        render: (_val: string, item: PairedTTestResult) => {
          if (isGroupedByDataset && !firstRowByDataset.has(item)) return null;
          return <strong>{item.datasetName}</strong>;
        },
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
        render: (item: PairedTTestResult) => (
          <DiffValue diff={item.meanA - item.meanB} evaluatorName={item.evaluatorName} />
        ),
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
          <SignificanceBadge
            pValue={item.pValue}
            diff={item.meanA - item.meanB}
            evaluatorName={item.evaluatorName}
          />
        ),
      },
    ],
    [firstRowByDataset, isGroupedByDataset]
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
      <EuiFlexGroup alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="l">
            <h2>{i18n.PAGE_TITLE}</h2>
          </EuiTitle>
        </EuiFlexItem>
        {sortedResults.length > 0 && (
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              color={csvCopyState === 'failed' ? 'danger' : 'text'}
              iconType={
                csvCopyState === 'copied'
                  ? 'check'
                  : csvCopyState === 'failed'
                  ? 'warning'
                  : 'exportAction'
              }
              onClick={handleCsvExport}
              disabled={csvCopyState !== 'idle'}
            >
              {csvCopyState === 'copied'
                ? i18n.EXPORT_CSV_COPIED
                : csvCopyState === 'failed'
                ? i18n.EXPORT_CSV_FAILED
                : i18n.EXPORT_CSV}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="l" />

      <EuiFlexGroup gutterSize="m" responsive={false} alignItems="center">
        <EuiFlexItem>
          <RunHeader label={i18n.RUN_A_LABEL} runId={runIdA} isNewer={isNewerA} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={i18n.SWAP_RUNS_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="merge"
              aria-label={i18n.SWAP_RUNS_LABEL}
              onClick={() =>
                history.replace({
                  search: new URLSearchParams({
                    runA: runIdB,
                    runB: runIdA,
                  }).toString(),
                })
              }
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem>
          <RunHeader
            label={i18n.RUN_B_LABEL}
            runId={runIdB}
            isNewer={isNewerA !== undefined ? !isNewerA : undefined}
          />
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
          {(data.pairing.truncatedA || data.pairing.truncatedB) && (
            <>
              <EuiCallOut
                announceOnMount
                title={i18n.TRUNCATION_WARNING_TITLE}
                color="warning"
                iconType="warning"
                size="s"
              >
                <p>{i18n.TRUNCATION_WARNING_BODY}</p>
              </EuiCallOut>
              <EuiSpacer size="m" />
            </>
          )}

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

          {sortedResults.length === 0 ? (
            <EuiEmptyPrompt
              iconType="search"
              title={<h3>{i18n.NO_RESULTS_TITLE}</h3>}
              body={<p>{i18n.NO_RESULTS_BODY}</p>}
              actions={[
                <EuiButton onClick={() => history.push('/')}>{i18n.BACK_TO_RUNS}</EuiButton>,
              ]}
            />
          ) : (
            <EuiBasicTable<PairedTTestResult>
              tableCaption={i18n.TABLE_CAPTION}
              items={sortedResults}
              columns={columns}
              sorting={{
                sort: { field: sortField, direction: sortDirection },
              }}
              onChange={({ sort }) => {
                if (sort) {
                  setSortField(sort.field as keyof PairedTTestResult);
                  setSortDirection(sort.direction);
                }
              }}
              rowProps={(item) => ({
                onClick: () => handleRowClick(item),
                className: clickableRowClass,
              })}
            />
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
