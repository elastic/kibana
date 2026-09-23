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
import { KbnWarningCallout } from '@kbn/ui-callout';
import { useHistory, useLocation } from 'react-router-dom';
import { TraceWaterfall, useTraceSpans } from '@kbn/llm-trace-waterfall';
import type { Direction, PairedTTestResult } from '@kbn/evals-common';
import {
  useCompareExperiments,
  useEvalsTraceFetcher,
  useEvaluationExperiment,
  useExperimentDatasetExamples,
} from '../../hooks/use_evals_api';
import { computeCompareDiff, isImproved } from './compare_diff';
import { EvaluatorModelsBadge } from '../../components/evaluator_models_badge';
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
  scoreBaseline: number | null | undefined;
  scoreTarget: number | null | undefined;
  traceIdBaseline: string | null;
  traceIdTarget: string | null;
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

const SignificanceBadge: React.FC<{
  pValue: number | null;
  diff: number;
  direction: Direction;
}> = ({ pValue, diff, direction }) => {
  if (pValue === null || !Number.isFinite(pValue)) {
    return <EuiBadge color="hollow">{i18n.BADGE_INSUFFICIENT_DATA}</EuiBadge>;
  }
  if (pValue >= SIGNIFICANCE_THRESHOLD) {
    return <EuiBadge color="hollow">{i18n.BADGE_NOT_SIGNIFICANT}</EuiBadge>;
  }
  const color =
    direction === 'neutral' ? 'hollow' : isImproved(diff, direction) ? 'success' : 'danger';
  return <EuiBadge color={color}>{i18n.BADGE_SIGNIFICANT}</EuiBadge>;
};

const DIRECTION_HINTS: Record<Direction, string> = {
  maximize: i18n.DIFF_HIGHER_IS_BETTER,
  minimize: i18n.DIFF_LOWER_IS_BETTER,
  neutral: i18n.DIFF_NEUTRAL_DIRECTION,
};

const DiffValue: React.FC<{ diff: number; direction: Direction }> = ({ diff, direction }) => {
  const { euiTheme } = useEuiTheme();
  if (!Number.isFinite(diff)) return <span>-</span>;

  const improved = isImproved(diff, direction);
  let color: string | undefined;
  if (diff !== 0 && direction !== 'neutral') {
    color = improved ? euiTheme.colors.textSuccess : euiTheme.colors.textDanger;
  }

  const directionHint = DIRECTION_HINTS[direction];
  const verdictHint =
    diff === 0 || direction === 'neutral'
      ? null
      : improved
      ? i18n.DIFF_IMPROVED
      : i18n.DIFF_REGRESSED;
  const tooltip = verdictHint ? `${verdictHint} · ${directionHint}` : directionHint;

  return (
    <EuiToolTip content={tooltip}>
      <span tabIndex={0} style={{ color, fontWeight: diff !== 0 ? 600 : undefined }}>
        {formatDiff(diff)}
      </span>
    </EuiToolTip>
  );
};

const ExperimentHeader: React.FC<{
  label: string;
  experimentId: string;
  executionId?: string;
  isNewer?: boolean;
}> = ({ label, experimentId, executionId, isNewer }) => {
  const history = useHistory();
  const { data: experimentData, isLoading } = useEvaluationExperiment(experimentId, executionId);

  const branch = experimentData?.git_branch;
  const timestamp = experimentData?.timestamp;
  const taskModel = experimentData?.task_model?.id;
  const evaluatorModels = experimentData?.evaluator_models ?? [];
  const suiteId =
    experimentData?.suite_id !== 'unknown-suite' ? experimentData?.suite_id : undefined;
  const displayName = suiteId ?? experimentData?.experiment_name ?? experimentId;
  const detailLocation = {
    pathname: `/experiments/${encodeURIComponent(experimentId)}`,
    search: executionId ? `?execution_id=${encodeURIComponent(executionId)}` : '',
  };
  const detailHref = history.createHref(detailLocation);

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
          <EuiToolTip
            content={
              <>
                {i18n.VIEW_EXPERIMENT_DETAIL}
                <br />
                {experimentId}
              </>
            }
          >
            <EuiLink
              href={detailHref}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) {
                  return;
                }
                event.preventDefault();
                history.push(detailLocation);
              }}
            >
              {displayName}
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
          {/* Always shown, unlike the task model above: an experiment scored only by code
              evaluators has no judge, and the badge says so rather than leaving the reader to
              guess whether the field is missing or empty. */}
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <strong>{i18n.STAT_EVALUATOR_MODEL}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EvaluatorModelsBadge models={evaluatorModels} />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};

const ExampleDrilldownFlyout: React.FC<{
  baselineExperimentId: string;
  targetExperimentId: string;
  datasetId: string;
  datasetName: string;
  evaluatorName: string;
  direction: Direction;
  baselineExecutionId?: string;
  targetExecutionId?: string;
  onClose: () => void;
}> = ({
  baselineExperimentId,
  targetExperimentId,
  datasetId,
  datasetName,
  evaluatorName,
  direction,
  baselineExecutionId,
  targetExecutionId,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const fetchTrace = useEvalsTraceFetcher();
  const {
    spans,
    durationMs,
    isLoading: traceLoading,
    error: traceError,
  } = useTraceSpans(selectedTraceId, { fetchTrace });
  const { data: baselineExamples, isLoading: loadingBaseline } = useExperimentDatasetExamples(
    baselineExperimentId,
    datasetId,
    baselineExecutionId
  );
  const { data: targetExamples, isLoading: loadingTarget } = useExperimentDatasetExamples(
    targetExperimentId,
    datasetId,
    targetExecutionId
  );

  const pairs: ExampleScorePair[] = useMemo(() => {
    if (!baselineExamples?.examples || !targetExamples?.examples) return [];

    interface TargetScoreEntry {
      score: number | null | undefined;
      traceId: string | null;
    }
    const targetScoresByExample = new Map<string, Map<string, TargetScoreEntry>>();
    for (const ex of targetExamples.examples) {
      const scoresByKey = new Map<string, TargetScoreEntry>();
      for (const score of ex.scores) {
        const key = `${score.evaluator.name}|${score.task.repetition_index}`;
        scoresByKey.set(key, {
          score: score.evaluator.score,
          traceId: score.task.trace_id ?? null,
        });
      }
      targetScoresByExample.set(ex.example_id, scoresByKey);
    }

    const result: ExampleScorePair[] = [];
    const coveredTargetExamples = new Set<string>();

    for (const ex of baselineExamples.examples) {
      const targetScores = targetScoresByExample.get(ex.example_id);
      for (const score of ex.scores) {
        if (score.evaluator.name !== evaluatorName) continue;
        coveredTargetExamples.add(ex.example_id);
        const key = `${score.evaluator.name}|${score.task.repetition_index}`;
        const targetEntry = targetScores?.get(key);
        result.push({
          exampleId: ex.example_id,
          exampleIndex: ex.example_index,
          evaluatorName: score.evaluator.name,
          repetitionIndex: score.task.repetition_index,
          scoreBaseline: score.evaluator.score,
          scoreTarget: targetEntry?.score ?? null,
          traceIdBaseline: score.task.trace_id ?? null,
          traceIdTarget: targetEntry?.traceId ?? null,
        });
      }
    }

    for (const ex of targetExamples.examples) {
      if (coveredTargetExamples.has(ex.example_id)) continue;
      for (const score of ex.scores) {
        if (score.evaluator.name !== evaluatorName) continue;
        result.push({
          exampleId: ex.example_id,
          exampleIndex: ex.example_index,
          evaluatorName: score.evaluator.name,
          repetitionIndex: score.task.repetition_index,
          scoreBaseline: null,
          scoreTarget: score.evaluator.score,
          traceIdBaseline: null,
          traceIdTarget: score.task.trace_id ?? null,
        });
      }
    }

    return result.sort((a, b) => {
      const indexDiff = (a.exampleIndex ?? 0) - (b.exampleIndex ?? 0);
      if (indexDiff !== 0) return indexDiff;
      return a.repetitionIndex - b.repetitionIndex;
    });
  }, [baselineExamples, targetExamples, evaluatorName]);

  const isLoading = loadingBaseline || loadingTarget;
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
            item.scoreBaseline != null &&
            item.scoreTarget != null &&
            Number.isFinite(item.scoreBaseline) &&
            Number.isFinite(item.scoreTarget);
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
        field: 'scoreBaseline',
        name: i18n.FLYOUT_COLUMN_SCORE_BASELINE,
        align: 'right' as const,
        render: (val: number | null | undefined) => formatScore(val),
      },
      {
        field: 'scoreTarget',
        name: i18n.FLYOUT_COLUMN_SCORE_TARGET,
        align: 'right' as const,
        render: (val: number | null | undefined) => formatScore(val),
      },
      {
        name: i18n.FLYOUT_COLUMN_DIFF,
        align: 'right' as const,
        render: (item: ExampleScorePair) => {
          if (
            item.scoreBaseline === null ||
            item.scoreBaseline === undefined ||
            item.scoreTarget === null ||
            item.scoreTarget === undefined
          ) {
            return '-';
          }
          const diff = computeCompareDiff(item.scoreTarget, item.scoreBaseline);
          return <DiffValue diff={diff} direction={direction} />;
        },
      },
      {
        name: i18n.FLYOUT_COLUMN_TRACES,
        width: '80px',
        align: 'center' as const,
        render: (item: ExampleScorePair) => (
          <EuiFlexGroup gutterSize="xs" responsive={false} justifyContent="center">
            {item.traceIdBaseline && (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.FLYOUT_TRACE_BASELINE} disableScreenReaderOutput>
                  <EuiButtonIcon
                    size="xs"
                    iconType="chartWaterfall"
                    color="primary"
                    aria-label={i18n.FLYOUT_TRACE_BASELINE}
                    onClick={() => setSelectedTraceId(item.traceIdBaseline)}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
            {item.traceIdTarget && (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.FLYOUT_TRACE_TARGET} disableScreenReaderOutput>
                  <EuiButtonIcon
                    size="xs"
                    iconType="chartWaterfall"
                    color="accent"
                    aria-label={i18n.FLYOUT_TRACE_TARGET}
                    onClick={() => setSelectedTraceId(item.traceIdTarget)}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
      },
    ],
    [hasRepetitions, direction]
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
              iconType="magnify"
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
                  item.scoreBaseline != null &&
                  item.scoreTarget != null &&
                  Number.isFinite(item.scoreBaseline) &&
                  Number.isFinite(item.scoreTarget);

                if (!isPaired) {
                  return { style: { opacity: 0.55 } };
                }

                const diff = computeCompareDiff(item.scoreTarget!, item.scoreBaseline!);
                if (diff === 0 || direction === 'neutral') return {};
                if (isImproved(diff, direction)) {
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

export const CompareExperimentsPage: React.FC = () => {
  const history = useHistory();
  const { search } = useLocation();
  const { euiTheme } = useEuiTheme();

  const params = useMemo(() => new URLSearchParams(search), [search]);
  const compareType = params.get('type') === 'execution' ? 'execution' : 'experiment';
  const baselineId = params.get('baseline') ?? '';
  const targetId = params.get('target') ?? '';
  const isExecutionCompare = compareType === 'execution';

  const { data, isLoading, error, refetch } = useCompareExperiments(
    compareType,
    baselineId,
    targetId
  );
  const baselineExecutionId = isExecutionCompare ? baselineId : undefined;
  const targetExecutionId = isExecutionCompare ? targetId : undefined;
  const { data: baselineExperimentData } = useEvaluationExperiment(baselineId, baselineExecutionId);
  const { data: targetExperimentData } = useEvaluationExperiment(targetId, targetExecutionId);

  const isBaselineNewer = useMemo(() => {
    if (!baselineExperimentData?.timestamp || !targetExperimentData?.timestamp) return undefined;
    const baselineTs = new Date(baselineExperimentData.timestamp).getTime();
    const targetTs = new Date(targetExperimentData.timestamp).getTime();
    if (baselineTs === targetTs) return undefined;
    return baselineTs > targetTs;
  }, [baselineExperimentData?.timestamp, targetExperimentData?.timestamp]);

  const [flyoutState, setFlyoutState] = useState<{
    datasetId: string;
    datasetName: string;
    evaluatorName: string;
    direction: Direction;
  } | null>(null);

  const [sortField, setSortField] = useState<keyof PairedTTestResult>('datasetName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleRowClick = useCallback((result: PairedTTestResult) => {
    setFlyoutState({
      datasetId: result.datasetId,
      datasetName: result.datasetName,
      evaluatorName: result.evaluatorName,
      direction: result.direction,
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
      'Mean baseline',
      'Mean target',
      'Diff',
      'Direction',
      'p-value',
      'Significant',
      'Outcome',
    ];
    const rows = sortedResults.map((r) => {
      const diff = computeCompareDiff(r.meanTarget, r.meanBaseline);
      const significant =
        r.pValue !== null && Number.isFinite(r.pValue) && r.pValue < SIGNIFICANCE_THRESHOLD;
      let outcome = '';
      if (significant && r.direction !== 'neutral') {
        outcome = isImproved(diff, r.direction) ? 'Improvement' : 'Regression';
      }
      return [
        `"${r.datasetName.replace(/"/g, '""')}"`,
        `"${r.evaluatorName.replace(/"/g, '""')}"`,
        r.sampleSize,
        r.meanBaseline.toFixed(4),
        r.meanTarget.toFixed(4),
        diff.toFixed(4),
        r.direction,
        r.pValue !== null && Number.isFinite(r.pValue) ? r.pValue.toFixed(6) : '',
        significant ? 'Yes' : 'No',
        outcome,
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
        field: 'meanBaseline',
        name: i18n.COLUMN_MEAN_BASELINE,
        sortable: true,
        render: (val: number) => formatScore(val),
        align: 'right' as const,
      },
      {
        field: 'meanTarget',
        name: i18n.COLUMN_MEAN_TARGET,
        sortable: true,
        render: (val: number) => formatScore(val),
        align: 'right' as const,
      },
      {
        name: i18n.COLUMN_DIFF,
        render: (item: PairedTTestResult) => (
          <DiffValue
            diff={computeCompareDiff(item.meanTarget, item.meanBaseline)}
            direction={item.direction}
          />
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
            diff={computeCompareDiff(item.meanTarget, item.meanBaseline)}
            direction={item.direction}
          />
        ),
      },
    ],
    [firstRowByDataset, isGroupedByDataset]
  );

  if (!baselineId || !targetId) {
    return (
      <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
        <EuiEmptyPrompt
          iconType="compareArrows"
          title={<h2>{i18n.MISSING_EXPERIMENT_IDS_TITLE}</h2>}
          body={<p>{i18n.MISSING_EXPERIMENT_IDS_BODY}</p>}
          actions={[
            <EuiButton onClick={() => history.push('/')}>{i18n.BACK_TO_EXPERIMENTS}</EuiButton>,
          ]}
        />
      </EuiPageSection>
    );
  }

  return (
    <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
      <EuiFlexGroup alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="m">
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
                  : 'upload'
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
          <ExperimentHeader
            label={i18n.BASELINE_LABEL}
            experimentId={baselineId}
            executionId={baselineExecutionId}
            isNewer={isBaselineNewer}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={i18n.SWAP_EXPERIMENTS_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="merge"
              aria-label={i18n.SWAP_EXPERIMENTS_LABEL}
              onClick={() => {
                const swapped = new URLSearchParams({
                  type: compareType,
                  baseline: targetId,
                  target: baselineId,
                });
                history.replace({ search: swapped.toString() });
              }}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem>
          <ExperimentHeader
            label={i18n.TARGET_LABEL}
            experimentId={targetId}
            executionId={targetExecutionId}
            isNewer={isBaselineNewer !== undefined ? !isBaselineNewer : undefined}
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
          {(data.pairing.truncatedBaseline || data.pairing.truncatedTarget) && (
            <>
              <KbnWarningCallout
                announceOnMount
                title={i18n.TRUNCATION_WARNING_TITLE}
                text={i18n.TRUNCATION_WARNING_BODY}
                size="s"
              />
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
              iconType="magnify"
              title={<h3>{i18n.NO_RESULTS_TITLE}</h3>}
              body={<p>{i18n.NO_RESULTS_BODY}</p>}
              actions={[
                <EuiButton onClick={() => history.push('/')}>{i18n.BACK_TO_EXPERIMENTS}</EuiButton>,
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
          baselineExperimentId={baselineId}
          targetExperimentId={targetId}
          datasetId={flyoutState.datasetId}
          datasetName={flyoutState.datasetName}
          evaluatorName={flyoutState.evaluatorName}
          direction={flyoutState.direction}
          baselineExecutionId={baselineExecutionId}
          targetExecutionId={targetExecutionId}
          onClose={() => setFlyoutState(null)}
        />
      )}
    </EuiPageSection>
  );
};
