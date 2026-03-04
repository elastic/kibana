/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonGroup,
  EuiButtonEmpty,
  EuiCodeBlock,
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
  repetitionIndices: number[];
  scoresByRepetition: Record<number, EvaluationRunDatasetExample['scores']>;
}

export interface ExampleScoresTableProps {
  examples: EvaluationRunDatasetExample[];
  onTraceClick: (traceId: string) => void;
}

export const ExampleScoresTable: React.FC<ExampleScoresTableProps> = ({
  examples,
  onTraceClick,
}) => {
  const [selectedRepetitions, setSelectedRepetitions] = useState<Record<string, number>>({});

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

        const scoresByRepetition = scoreDocuments.reduce<
          Record<number, EvaluationRunDatasetExample['scores']>
        >((acc, score) => {
          const repetitionIndex = score.task.repetition_index;
          const existingScores = acc[repetitionIndex] ?? [];
          existingScores.push(score);
          acc[repetitionIndex] = existingScores;
          return acc;
        }, {});

        const repetitionIndices = Object.keys(scoresByRepetition)
          .map((value) => Number(value))
          .sort((a, b) => a - b);

        return {
          exampleId: example.example_id,
          exampleIndex: example.example_index,
          repetitionIndices,
          scoresByRepetition,
        };
      });
  }, [examples]);

  const getSelectedRepetitionIndex = (row: ExampleScoreRow): number => {
    const defaultRepetitionIndex = row.repetitionIndices[0] ?? 0;
    const selectedRepetitionIndex = selectedRepetitions[row.exampleId];
    if (
      selectedRepetitionIndex == null ||
      !row.repetitionIndices.includes(selectedRepetitionIndex)
    ) {
      return defaultRepetitionIndex;
    }
    return selectedRepetitionIndex;
  };

  const getScoresForSelectedRepetition = (
    row: ExampleScoreRow
  ): EvaluationRunDatasetExample['scores'] => {
    const selectedRepetitionIndex = getSelectedRepetitionIndex(row);
    return row.scoresByRepetition[selectedRepetitionIndex] ?? [];
  };

  const getEvaluatorScoreBadges = (row: ExampleScoreRow): EvaluatorScoreBadge[] =>
    getScoresForSelectedRepetition(row).map((score) => ({
      key: [
        row.exampleId,
        score.evaluator.name,
        score.task.repetition_index,
        score.task.trace_id ?? 'no_trace',
        score['@timestamp'],
      ].join(':'),
      label: `${score.evaluator.name}: ${formatScore(score.evaluator.score)}`,
    }));

  const getSelectedTraceIds = (row: ExampleScoreRow): string[] =>
    Array.from(
      new Set(
        getScoresForSelectedRepetition(row)
          .map((score) => score.task.trace_id)
          .filter((value): value is string => Boolean(value))
      )
    );

  const renderJsonPreview = (value: unknown) => {
    if (value == null) {
      return '-';
    }

    const serializedValue = JSON.stringify(value, null, 2);
    if (!serializedValue) {
      return '-';
    }

    return (
      <EuiCodeBlock overflowHeight={120} language="json" paddingSize="none" fontSize="s">
        {serializedValue}
      </EuiCodeBlock>
    );
  };

  const columns: Array<EuiBasicTableColumn<ExampleScoreRow>> = [
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
      field: 'repetitionIndices',
      name: i18n.COLUMN_REPETITION,
      width: '180px',
      render: (_repetitionIndices: number[], row: ExampleScoreRow) =>
        row.repetitionIndices.length > 1 ? (
          <EuiButtonGroup
            type="single"
            isFullWidth={false}
            legend={i18n.getRepetitionButtonGroupLegend(row.exampleId)}
            options={row.repetitionIndices.map((repetitionIndex) => ({
              id: String(repetitionIndex),
              label: i18n.getRepetitionButtonLabel(repetitionIndex),
            }))}
            idSelected={String(getSelectedRepetitionIndex(row))}
            onChange={(id) =>
              setSelectedRepetitions((previousSelection) => ({
                ...previousSelection,
                [row.exampleId]: Number(id),
              }))
            }
            buttonSize="compressed"
          />
        ) : (
          i18n.getRepetitionButtonLabel(row.repetitionIndices[0] ?? 0)
        ),
    },
    {
      field: 'scoresByRepetition',
      name: i18n.COLUMN_INPUT,
      width: '240px',
      render: (
        _scoresByRepetition: ExampleScoreRow['scoresByRepetition'],
        row: ExampleScoreRow
      ) => {
        const firstScoreDocument = getScoresForSelectedRepetition(row)[0];
        return renderJsonPreview(firstScoreDocument?.example.input);
      },
    },
    {
      field: 'scoresByRepetition',
      name: i18n.COLUMN_OUTPUT,
      width: '240px',
      render: (
        _scoresByRepetition: ExampleScoreRow['scoresByRepetition'],
        row: ExampleScoreRow
      ) => {
        const firstScoreDocument = getScoresForSelectedRepetition(row)[0];
        return renderJsonPreview(firstScoreDocument?.task.output);
      },
    },
    {
      field: 'scoresByRepetition',
      name: i18n.COLUMN_EVALUATOR_SCORES,
      render: (
        _scoresByRepetition: ExampleScoreRow['scoresByRepetition'],
        row: ExampleScoreRow
      ) => {
        const evaluatorScoreBadges = getEvaluatorScoreBadges(row);
        return evaluatorScoreBadges.length > 0 ? (
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
        );
      },
    },
    {
      field: 'scoresByRepetition',
      name: i18n.COLUMN_TRACE,
      render: (
        _scoresByRepetition: ExampleScoreRow['scoresByRepetition'],
        row: ExampleScoreRow
      ) => {
        const traceIds = getSelectedTraceIds(row);
        return traceIds.length > 0 ? (
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
        );
      },
    },
  ];

  return (
    <EuiBasicTable
      items={rows}
      columns={columns}
      noItemsMessage={i18n.EMPTY_TABLE_MESSAGE}
      tableCaption={i18n.TABLE_CAPTION}
    />
  );
};
