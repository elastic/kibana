/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { EvaluationRunDatasetExample } from '@kbn/evals-common';
import * as i18n from './translations';

const EXAMPLE_ID_VISIBLE_LENGTH = 16;
const TRACE_ID_VISIBLE_LENGTH = 12;

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;

const formatScore = (score: number | null | undefined) =>
  score == null ? i18n.SCORE_NOT_AVAILABLE : score.toFixed(2);

interface EvaluatorScoreBadge {
  key: string;
  label: string;
}

interface ExampleScoreRow {
  exampleId: string;
  exampleIndex: number | null;
  evaluatorScoreBadges: EvaluatorScoreBadge[];
  traceIds: string[];
}

export interface ExampleScoresTableProps {
  examples: EvaluationRunDatasetExample[];
  onTraceClick: (traceId: string) => void;
}

export const ExampleScoresTable: React.FC<ExampleScoresTableProps> = ({
  examples,
  onTraceClick,
}) => {
  const rows = useMemo<ExampleScoreRow[]>(() => {
    return [...examples]
      .sort((a, b) => {
        const leftIndex = a.example_index ?? Number.MAX_SAFE_INTEGER;
        const rightIndex = b.example_index ?? Number.MAX_SAFE_INTEGER;
        if (leftIndex !== rightIndex) {
          return leftIndex - rightIndex;
        }
        return a.example_id.localeCompare(b.example_id);
      })
      .map((example) => {
        const scoreDocuments = [...example.scores].sort((a, b) => {
          const repetitionDelta = a.task.repetition_index - b.task.repetition_index;
          if (repetitionDelta !== 0) {
            return repetitionDelta;
          }
          return a.evaluator.name.localeCompare(b.evaluator.name);
        });

        const evaluatorScoreCounts = scoreDocuments.reduce<Record<string, number>>((acc, score) => {
          const key = score.evaluator.name;
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {});

        const evaluatorScoreBadges: EvaluatorScoreBadge[] = scoreDocuments.map((score) => {
          const includeRepetition = (evaluatorScoreCounts[score.evaluator.name] ?? 0) > 1;
          const repetitionLabel = includeRepetition ? ` (r${score.task.repetition_index + 1})` : '';
          const scoreLabel = formatScore(score.evaluator.score);

          return {
            key: [
              score.evaluator.name,
              score.task.repetition_index,
              score.task.trace_id ?? 'no_trace',
              score['@timestamp'],
            ].join(':'),
            label: `${score.evaluator.name}${repetitionLabel}: ${scoreLabel}`,
          };
        });

        const traceIds = Array.from(
          new Set(
            scoreDocuments
              .map((score) => score.task.trace_id)
              .filter((value): value is string => Boolean(value))
          )
        );

        return {
          exampleId: example.example_id,
          exampleIndex: example.example_index,
          evaluatorScoreBadges,
          traceIds,
        };
      });
  }, [examples]);

  const columns = useMemo<Array<EuiBasicTableColumn<ExampleScoreRow>>>(
    () => [
      {
        field: 'exampleIndex',
        name: i18n.COLUMN_EXAMPLE_NUMBER,
        width: '120px',
        render: (exampleIndex: number | null) =>
          exampleIndex == null ? '-' : String(exampleIndex + 1),
      },
      {
        field: 'exampleId',
        name: i18n.COLUMN_EXAMPLE_ID,
        render: (exampleId: string) => truncate(exampleId, EXAMPLE_ID_VISIBLE_LENGTH),
      },
      {
        field: 'evaluatorScoreBadges',
        name: i18n.COLUMN_EVALUATOR_SCORES,
        render: (evaluatorScoreBadges: EvaluatorScoreBadge[]) =>
          evaluatorScoreBadges.length > 0 ? (
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {evaluatorScoreBadges.map((evaluatorScoreBadge) => (
                <EuiFlexItem key={evaluatorScoreBadge.key} grow={false}>
                  <EuiBadge color="hollow">{evaluatorScoreBadge.label}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          ) : (
            <EuiText color="subdued" size="s">
              {i18n.NO_EVALUATOR_SCORES}
            </EuiText>
          ),
      },
      {
        field: 'traceIds',
        name: i18n.COLUMN_TRACE,
        render: (traceIds: string[]) =>
          traceIds.length > 0 ? (
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {traceIds.map((traceId) => (
                <EuiFlexItem key={traceId} grow={false}>
                  <EuiButtonEmpty
                    size="xs"
                    iconType="apmTrace"
                    onClick={() => onTraceClick(traceId)}
                    aria-label={i18n.getTraceButtonAriaLabel(traceId)}
                  >
                    {truncate(traceId, TRACE_ID_VISIBLE_LENGTH)}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          ) : (
            '-'
          ),
      },
    ],
    [onTraceClick]
  );

  return <EuiBasicTable items={rows} columns={columns} noItemsMessage={i18n.EMPTY_TABLE_MESSAGE} />;
};
