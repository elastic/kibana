/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode, useCallback, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiSpacer,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/css';
import type { EvaluationRunDatasetExample, EvaluationScoreDocument } from '@kbn/evals-common';
import * as i18n from './translations';

const EXAMPLE_ID_VISIBLE_LENGTH = 16;

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;

const formatScore = (score: number | null | undefined) =>
  score == null ? i18n.SCORE_NOT_AVAILABLE : score.toFixed(2);

const hasNonEmptyMetadata = (
  metadata: Record<string, unknown> | null | undefined
): metadata is Record<string, unknown> => metadata != null && Object.keys(metadata).length > 0;

const accordionButtonCss = css`
  padding: 2px 0;
`;

const repetitionPaginationCss = css`
  display: flex;
  justify-content: center;

  [data-test-subj='pagination-button-first'],
  [data-test-subj='pagination-button-last'] {
    display: none;
  }
`;

const EvaluatorScoreAccordion: React.FC<{
  score: EvaluationScoreDocument;
  exampleId: string;
  onTraceClick: (traceId: string) => void;
}> = ({ score, exampleId, onTraceClick }) => {
  const { evaluator } = score;
  const accordionId = [exampleId, evaluator.name, score.task.repetition_index].join('-');

  const hasExplanation = evaluator.explanation != null && evaluator.explanation.length > 0;
  const hasMetadata = hasNonEmptyMetadata(evaluator.metadata);
  const hasTraceId = evaluator.trace_id != null && evaluator.trace_id.length > 0;
  const hasDetails = hasExplanation || hasMetadata || hasTraceId;

  const buttonContent = (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <strong>{evaluator.name}:</strong> {formatScore(evaluator.score)}
        </EuiText>
      </EuiFlexItem>
      {evaluator.label && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{evaluator.label}</EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  if (!hasDetails) {
    return <div className={accordionButtonCss}>{buttonContent}</div>;
  }

  return (
    <EuiAccordion
      id={`evaluator-${accordionId}`}
      buttonContent={buttonContent}
      buttonClassName={accordionButtonCss}
      paddingSize="xs"
      arrowDisplay="left"
      aria-label={i18n.getEvaluatorAccordionAriaLabel(evaluator.name)}
    >
      <div>
        {hasExplanation && (
          <>
            <EuiText size="xs" color="subdued">
              <strong>{i18n.EVALUATOR_EXPLANATION}</strong>
            </EuiText>
            <EuiText size="xs">{evaluator.explanation}</EuiText>
            <EuiSpacer size="xs" />
          </>
        )}
        {hasMetadata && (
          <>
            <EuiText size="xs" color="subdued">
              <strong>{i18n.EVALUATOR_METADATA}</strong>
            </EuiText>
            <EuiCodeBlock overflowHeight={100} language="json" paddingSize="s" fontSize="s">
              {JSON.stringify(evaluator.metadata, null, 2)}
            </EuiCodeBlock>
            <EuiSpacer size="xs" />
          </>
        )}
        {hasTraceId && (
          <EuiButtonEmpty
            size="xs"
            iconType="apmTrace"
            onClick={() => onTraceClick(evaluator.trace_id!)}
            aria-label={i18n.getEvaluatorViewTraceAriaLabel(evaluator.name)}
          >
            {i18n.EVALUATOR_VIEW_TRACE}
          </EuiButtonEmpty>
        )}
      </div>
    </EuiAccordion>
  );
};

interface ExampleScoreRow {
  exampleId: string;
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
      .sort((a, b) => a.example_id.localeCompare(b.example_id))
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
        >((acc, scoreDoc) => {
          const repetitionIndex = scoreDoc.task.repetition_index;
          const existingScores = acc[repetitionIndex] ?? [];
          existingScores.push(scoreDoc);
          acc[repetitionIndex] = existingScores;
          return acc;
        }, {});

        const repetitionIndices = Object.keys(scoresByRepetition)
          .map((value) => Number(value))
          .sort((a, b) => a - b);

        return {
          exampleId: example.example_id,
          repetitionIndices,
          scoresByRepetition,
        };
      });
  }, [examples]);

  const getSelectedRepetitionIndex = useCallback(
    (row: ExampleScoreRow): number => {
      const defaultRepetitionIndex = row.repetitionIndices[0] ?? 0;
      const selectedRepetitionIndex = selectedRepetitions[row.exampleId];
      if (
        selectedRepetitionIndex == null ||
        !row.repetitionIndices.includes(selectedRepetitionIndex)
      ) {
        return defaultRepetitionIndex;
      }
      return selectedRepetitionIndex;
    },
    [selectedRepetitions]
  );

  const getScoresForSelectedRepetition = (
    row: ExampleScoreRow
  ): EvaluationRunDatasetExample['scores'] => {
    const selectedRepetitionIndex = getSelectedRepetitionIndex(row);
    return row.scoresByRepetition[selectedRepetitionIndex] ?? [];
  };

  const getSelectedTraceIds = (row: ExampleScoreRow): string[] =>
    Array.from(
      new Set(
        getScoresForSelectedRepetition(row)
          .map((scoreDoc) => scoreDoc.task.trace_id)
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

  const getScoreKey = (scoreDoc: EvaluationScoreDocument, exampleId: string): string =>
    [
      exampleId,
      scoreDoc.evaluator.name,
      scoreDoc.task.repetition_index,
      scoreDoc.task.trace_id ?? 'no_trace',
      scoreDoc['@timestamp'],
    ].join(':');

  const itemIdToExpandedRowMap = useMemo<Record<string, ReactNode>>(() => {
    return rows.reduce<Record<string, ReactNode>>((acc, row) => {
      if (row.repetitionIndices.length > 1) {
        acc[row.exampleId] = (
          <EuiPagination
            className={repetitionPaginationCss}
            aria-label={i18n.getRepetitionPaginationAriaLabel(row.exampleId)}
            pageCount={row.repetitionIndices.length}
            activePage={row.repetitionIndices.indexOf(getSelectedRepetitionIndex(row))}
            onPageClick={(pageIndex) =>
              setSelectedRepetitions((prev) => ({
                ...prev,
                [row.exampleId]: row.repetitionIndices[pageIndex],
              }))
            }
            compressed
          />
        );
      }
      return acc;
    }, {});
  }, [rows, getSelectedRepetitionIndex]);

  const columns: Array<EuiBasicTableColumn<ExampleScoreRow>> = [
    {
      field: 'exampleId',
      name: i18n.COLUMN_EXAMPLE_ID,
      width: '180px',
      render: (exampleId: string) => truncate(exampleId, EXAMPLE_ID_VISIBLE_LENGTH),
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
      width: '300px',
      render: (
        _scoresByRepetition: ExampleScoreRow['scoresByRepetition'],
        row: ExampleScoreRow
      ) => {
        const scores = getScoresForSelectedRepetition(row);
        return scores.length > 0 ? (
          <div>
            {scores.map((scoreDoc) => (
              <EvaluatorScoreAccordion
                key={getScoreKey(scoreDoc, row.exampleId)}
                score={scoreDoc}
                exampleId={row.exampleId}
                onTraceClick={onTraceClick}
              />
            ))}
          </div>
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
                <EuiButtonIcon
                  size="s"
                  iconType="apmTrace"
                  onClick={() => onTraceClick(traceId)}
                  aria-label={i18n.getTraceButtonAriaLabel(traceId)}
                />
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
      itemId="exampleId"
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      columns={columns}
      noItemsMessage={i18n.EMPTY_TABLE_MESSAGE}
      tableCaption={i18n.TABLE_CAPTION}
    />
  );
};
