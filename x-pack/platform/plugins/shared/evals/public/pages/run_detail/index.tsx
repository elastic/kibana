/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiPageTemplate,
  EuiBasicTable,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiStat,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiButtonEmpty,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutResizable,
  EuiTitle,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { useParams, useHistory } from 'react-router-dom';
import type { EvaluatorStats } from '@kbn/evals-common';
import { useEvaluationRun, useEvaluationRunScores } from '../../hooks/use_evals_api';
import { TraceWaterfall } from '../../components/trace_waterfall';
import * as i18n from './translations';

export const RunDetailPage: React.FC = () => {
  const { runId } = useParams<{ runId: string }>();
  const history = useHistory();
  const { data: runDetail, isLoading: runLoading, error: runError } = useEvaluationRun(runId);
  const { data: scoresData, isLoading: scoresLoading } = useEvaluationRunScores(runId);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  const runIdShort = runId.slice(0, 12);

  const uniqueTraceIds = useMemo(() => {
    if (!scoresData?.scores) return [];
    const traceIds = new Set<string>();
    for (const score of scoresData.scores) {
      const traceId = (score as any).task?.trace_id;
      if (traceId) traceIds.add(traceId);
    }
    return Array.from(traceIds);
  }, [scoresData?.scores]);

  const statsColumns: Array<EuiBasicTableColumn<EvaluatorStats>> = useMemo(
    () => [
      {
        field: 'dataset_name',
        name: i18n.COLUMN_DATASET,
        sortable: true,
      },
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
              <EuiFlexItem>
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiStat
                    title={String(scoresData?.total ?? '-')}
                    description={i18n.STAT_TOTAL_SCORES}
                    titleSize="xs"
                    isLoading={scoresLoading}
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiStat
                    title={String(uniqueTraceIds.length)}
                    description={i18n.STAT_TRACES}
                    titleSize="xs"
                  />
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="l" />
          </>
        )}

        {uniqueTraceIds.length > 0 && (
          <>
            <EuiText size="s">
              <h3>{i18n.SECTION_TRACES}</h3>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiFlexGroup wrap>
              {uniqueTraceIds.slice(0, 20).map((traceId) => (
                <EuiFlexItem key={traceId} grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    iconType="apmTrace"
                    onClick={() => setSelectedTraceId(traceId)}
                  >
                    {traceId.slice(0, 12)}...
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
            <EuiSpacer size="l" />
          </>
        )}

        <EuiText size="s">
          <h3>{i18n.SECTION_EVALUATOR_STATS}</h3>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiBasicTable<EvaluatorStats>
          items={runDetail?.stats ?? []}
          columns={statsColumns}
          loading={runLoading}
        />
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
