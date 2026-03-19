/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type MouseEvent } from 'react';
import {
  EuiAccordion,
  EuiBasicTable,
  EuiLink,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageSection,
  EuiStat,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutResizable,
  EuiTitle,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import type { EvaluatorStats } from '@kbn/evals-common';
import { useEvaluationRun, useRunDatasetExamples } from '../../hooks/use_evals_api';
import { ExampleScoresTable } from '../../components/example_scores_table';
import { TraceWaterfall } from '../../components/trace_waterfall';
import * as i18n from './translations';

const isLikelyUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const resolvePrUrl = (pullRequest: string): string | null => {
  const raw = pullRequest.trim();
  if (!raw || raw === 'false') return null;
  if (isLikelyUrl(raw)) return raw;
  if (/^\d+$/.test(raw)) {
    return `https://github.com/elastic/kibana/pull/${raw}`;
  }
  return null;
};

interface DatasetStatsGroup {
  datasetId: string;
  datasetName: string;
  stats: EvaluatorStats[];
}

interface DatasetStatsAccordionProps {
  runId: string;
  group: DatasetStatsGroup;
  totalRepetitions: number;
  statsColumns: Array<EuiBasicTableColumn<EvaluatorStats>>;
  runLoading: boolean;
  isOpen: boolean;
  selectedExampleId?: string | null;
  onTraceClick: (traceId: string, exampleId: string) => void;
  onDatasetClick: (datasetId: string) => void;
  onDatasetToggle: (datasetId: string, isOpen: boolean) => void;
  onExampleClick: (exampleId: string) => void;
}

const DatasetStatsAccordion: React.FC<DatasetStatsAccordionProps> = ({
  runId,
  group,
  totalRepetitions,
  statsColumns,
  runLoading,
  isOpen,
  selectedExampleId,
  onTraceClick,
  onDatasetClick,
  onDatasetToggle,
  onExampleClick,
}) => {
  const {
    data: datasetExamples,
    isLoading: examplesLoading,
    error: examplesError,
  } = useRunDatasetExamples(runId, isOpen ? group.datasetId : '');

  const scoreCount = group.stats[0]?.stats.count;
  const exampleCount = scoreCount != null ? Math.round(scoreCount / totalRepetitions) : undefined;

  return (
    <>
      <EuiAccordion
        id={`runDatasetAccordion-${group.datasetId}`}
        buttonContent={
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <h4>
                  <EuiLink
                    onClick={(event: MouseEvent<HTMLAnchorElement>) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onDatasetClick(group.datasetId);
                    }}
                  >
                    {group.datasetName}
                  </EuiLink>
                </h4>
              </EuiText>
            </EuiFlexItem>
            {exampleCount != null && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.getExampleCountLabel(exampleCount)}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        }
        forceState={isOpen ? 'open' : 'closed'}
        onToggle={(nextIsOpen) => onDatasetToggle(group.datasetId, nextIsOpen)}
      >
        <EuiSpacer size="m" />
        <EuiText size="s">
          <h5>{i18n.SECTION_EXAMPLE_SCORES}</h5>
        </EuiText>
        <EuiSpacer size="s" />
        {examplesError ? (
          <EuiText color="danger" size="s">
            <p>{i18n.getExamplesLoadError(String(examplesError))}</p>
          </EuiText>
        ) : (
          <ExampleScoresTable
            examples={datasetExamples?.examples ?? []}
            selectedExampleId={selectedExampleId}
            onExampleClick={onExampleClick}
            onTraceClick={onTraceClick}
          />
        )}
        <EuiSpacer size="m" />
        <EuiText size="s">
          <h5>{i18n.SECTION_EVALUATOR_STATS}</h5>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiBasicTable<EvaluatorStats>
          items={group.stats}
          columns={statsColumns}
          loading={runLoading || (isOpen && examplesLoading)}
        />
      </EuiAccordion>
      <EuiSpacer size="l" />
    </>
  );
};

export const RunDetailPage: React.FC = () => {
  const { runId } = useParams<{ runId: string }>();
  const history = useHistory();
  const location = useLocation();
  const { euiTheme } = useEuiTheme();
  const { data: runDetail, isLoading: runLoading, error: runError } = useEvaluationRun(runId);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const openDatasetId = searchParams.get('dataset_id');
  const selectedExampleId = searchParams.get('example_id');
  const selectedTraceId = searchParams.get('trace_id');
  const prUrl = useMemo(() => {
    const pr = runDetail?.ci?.pull_request;
    return pr ? resolvePrUrl(pr) : null;
  }, [runDetail?.ci?.pull_request]);

  const updateSearchParams = (updater: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(location.search);
    updater(next);
    const search = next.toString();
    history.push({
      pathname: location.pathname,
      search: search ? `?${search}` : '',
    });
  };

  const setOpenDatasetId = (datasetId: string | null) => {
    updateSearchParams((params) => {
      if (datasetId) {
        params.set('dataset_id', datasetId);
      } else {
        params.delete('dataset_id');
        params.delete('example_id');
        params.delete('trace_id');
      }
    });
  };

  const setSelectedExample = (exampleId: string | null) => {
    updateSearchParams((params) => {
      if (exampleId) {
        params.set('example_id', exampleId);
      } else {
        params.delete('example_id');
      }
    });
  };

  const setSelectedTrace = (traceId: string | null, exampleId?: string) => {
    updateSearchParams((params) => {
      if (traceId) {
        params.set('trace_id', traceId);
        if (exampleId) {
          params.set('example_id', exampleId);
        }
      } else {
        params.delete('trace_id');
      }
    });
  };

  const datasetStatsGroups = useMemo(() => {
    const groupedStats = new Map<
      string,
      { datasetId: string; datasetName: string; stats: EvaluatorStats[] }
    >();

    for (const stat of runDetail?.stats ?? []) {
      const existingGroup = groupedStats.get(stat.dataset_id);
      if (existingGroup) {
        existingGroup.stats.push(stat);
        continue;
      }

      groupedStats.set(stat.dataset_id, {
        datasetId: stat.dataset_id,
        datasetName: stat.dataset_name,
        stats: [stat],
      });
    }

    return Array.from(groupedStats.values()).sort((a, b) =>
      a.datasetName.localeCompare(b.datasetName)
    );
  }, [runDetail?.stats]);

  const statsColumns: Array<EuiBasicTableColumn<EvaluatorStats>> = useMemo(
    () => [
      {
        field: 'evaluator_name',
        name: i18n.COLUMN_EVALUATOR,
        sortable: true,
        render: (name: string) => (
          <EuiText size="s">
            <strong>{name}</strong>
          </EuiText>
        ),
      },
      {
        field: 'stats.mean',
        name: i18n.COLUMN_MEAN,
        sortable: true,
        render: (value: number) => value.toFixed(2),
      },
      {
        field: 'stats.median',
        name: i18n.COLUMN_MEDIAN,
        render: (value: number) => value.toFixed(2),
      },
      {
        field: 'stats.std_dev',
        name: i18n.COLUMN_STD_DEV,
        render: (value: number) => value.toFixed(2),
      },
      {
        field: 'stats.min',
        name: i18n.COLUMN_MIN,
        render: (value: number) => value.toFixed(2),
      },
      {
        field: 'stats.max',
        name: i18n.COLUMN_MAX,
        render: (value: number) => value.toFixed(2),
      },
    ],
    []
  );

  return (
    <>
      <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
        <EuiTitle size="l">
          <h2>{i18n.getPageTitle(runId)}</h2>
        </EuiTitle>
        <EuiSpacer size="l" />

        {runError ? (
          <>
            <EuiText color="danger" size="s">
              <p>{String(runError)}</p>
            </EuiText>
            <EuiSpacer size="m" />
          </>
        ) : null}

        {runDetail && (
          <>
            <EuiFlexGroup wrap>
              <EuiFlexItem>
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiStat
                    title={runDetail.task_model?.id ?? '-'}
                    description={i18n.STAT_TASK_MODEL}
                    titleSize="xs"
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiStat
                    title={runDetail.evaluator_model?.id ?? '-'}
                    description={i18n.STAT_EVALUATOR_MODEL}
                    titleSize="xs"
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiStat
                    title={String(runDetail.total_repetitions ?? '-')}
                    description={i18n.STAT_REPETITIONS}
                    titleSize="xs"
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiStat
                    title={
                      runDetail.git_branch ? (
                        <EuiBadge color="hollow">{runDetail.git_branch}</EuiBadge>
                      ) : (
                        '-'
                      )
                    }
                    description={i18n.STAT_BRANCH}
                    titleSize="xs"
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiStat
                    title={
                      runDetail.ci?.build_url ? (
                        <EuiLink href={runDetail.ci.build_url} target="_blank" external>
                          {i18n.CI_BUILD_LINK}
                        </EuiLink>
                      ) : (
                        '-'
                      )
                    }
                    description={i18n.STAT_CI}
                    titleSize="xs"
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiStat
                    title={
                      prUrl ? (
                        <EuiLink href={prUrl} target="_blank" external>
                          {i18n.PR_LINK}
                        </EuiLink>
                      ) : (
                        '-'
                      )
                    }
                    description={i18n.STAT_PULL_REQUEST}
                    titleSize="xs"
                  />
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="l" />
          </>
        )}

        <EuiText size="s">
          <h3>{i18n.SECTION_DATASETS}</h3>
        </EuiText>
        <EuiSpacer size="m" />
        {datasetStatsGroups.map(({ datasetId, datasetName, stats }) => (
          <DatasetStatsAccordion
            key={datasetId}
            runId={runId}
            group={{ datasetId, datasetName, stats }}
            totalRepetitions={runDetail?.total_repetitions ?? 1}
            statsColumns={statsColumns}
            runLoading={runLoading}
            isOpen={openDatasetId === datasetId}
            selectedExampleId={openDatasetId === datasetId ? selectedExampleId : null}
            onTraceClick={(traceId, exampleId) => setSelectedTrace(traceId, exampleId)}
            onDatasetClick={(targetDatasetId) => history.push(`/datasets/${targetDatasetId}`)}
            onDatasetToggle={(targetDatasetId, nextIsOpen) =>
              setOpenDatasetId(nextIsOpen ? targetDatasetId : null)
            }
            onExampleClick={(exampleId) => setSelectedExample(exampleId)}
          />
        ))}
      </EuiPageSection>

      {selectedTraceId && (
        <EuiFlyoutResizable
          ownFocus
          onClose={() => setSelectedTrace(null)}
          size="l"
          minWidth={480}
          maxWidth={1600}
          aria-labelledby="traceWaterfallTitle"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2 id="traceWaterfallTitle" style={{ wordBreak: 'break-all' }}>
                {i18n.getTraceFlyoutTitle(selectedTraceId)}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody
            className={css`
              .euiFlyoutBody__overflowContent {
                height: 100%;
                padding: 0;
              }
              .euiFlyoutBody__overflow {
                overflow: hidden;
              }
            `}
          >
            <div style={{ height: '100%', padding: 16 }}>
              <TraceWaterfall traceId={selectedTraceId} />
            </div>
          </EuiFlyoutBody>
        </EuiFlyoutResizable>
      )}
    </>
  );
};
