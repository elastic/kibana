/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, type MouseEvent } from 'react';
import {
  EuiPageTemplate,
  EuiAccordion,
  EuiBasicTable,
  EuiBadge,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiStat,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutResizable,
  EuiTitle,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { useParams, useHistory } from 'react-router-dom';
import type { EvaluatorStats } from '@kbn/evals-common';
import { useEvaluationRun, useRunDatasetExamples } from '../../hooks/use_evals_api';
import { ExampleScoresTable } from '../../components/example_scores_table';
import { TraceWaterfall } from '../../components/trace_waterfall';
import * as i18n from './translations';

interface DatasetStatsGroup {
  datasetId: string;
  datasetName: string;
  stats: EvaluatorStats[];
}

interface DatasetStatsAccordionProps {
  runId: string;
  group: DatasetStatsGroup;
  statsColumns: Array<EuiBasicTableColumn<EvaluatorStats>>;
  runLoading: boolean;
  onTraceClick: (traceId: string) => void;
  onDatasetClick: (datasetId: string) => void;
}

const DatasetStatsAccordion: React.FC<DatasetStatsAccordionProps> = ({
  runId,
  group,
  statsColumns,
  runLoading,
  onTraceClick,
  onDatasetClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    data: datasetExamples,
    isLoading: examplesLoading,
    error: examplesError,
  } = useRunDatasetExamples(runId, isOpen ? group.datasetId : '');

  return (
    <>
      <EuiAccordion
        id={`runDatasetAccordion-${group.datasetId}`}
        buttonContent={
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
        }
        onToggle={(nextIsOpen) => setIsOpen(nextIsOpen)}
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
            onTraceClick={(traceId) => onTraceClick(traceId)}
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
  const { data: runDetail, isLoading: runLoading, error: runError } = useEvaluationRun(runId);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  const runIdShort = runId.slice(0, 12);

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
        render: (name: string) => <EuiBadge color="hollow">{name}</EuiBadge>,
      },
      {
        field: 'stats.mean',
        name: i18n.COLUMN_MEAN,
        sortable: true,
        render: (value: number) => value.toFixed(3),
      },
      {
        field: 'stats.median',
        name: i18n.COLUMN_MEDIAN,
        render: (value: number) => value.toFixed(3),
      },
      {
        field: 'stats.std_dev',
        name: i18n.COLUMN_STD_DEV,
        render: (value: number) => value.toFixed(3),
      },
      {
        field: 'stats.min',
        name: i18n.COLUMN_MIN,
        render: (value: number) => value.toFixed(3),
      },
      {
        field: 'stats.max',
        name: i18n.COLUMN_MAX,
        render: (value: number) => value.toFixed(3),
      },
      {
        field: 'stats.count',
        name: i18n.COLUMN_COUNT,
        width: '70px',
      },
    ],
    []
  );

  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header
        pageTitle={i18n.getPageTitle(runIdShort)}
        breadcrumbs={[
          { text: i18n.BREADCRUMB_EVALUATIONS, onClick: () => history.push('/') },
          { text: i18n.getBreadcrumbRun(runIdShort) },
        ]}
      />
      <EuiPageTemplate.Section>
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
            <EuiFlexGroup>
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
            statsColumns={statsColumns}
            runLoading={runLoading}
            onTraceClick={setSelectedTraceId}
            onDatasetClick={(targetDatasetId) => history.push(`/datasets/${targetDatasetId}`)}
          />
        ))}
      </EuiPageTemplate.Section>

      {selectedTraceId && (
        <EuiFlyoutResizable
          ownFocus
          onClose={() => setSelectedTraceId(null)}
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
    </EuiPageTemplate>
  );
};
