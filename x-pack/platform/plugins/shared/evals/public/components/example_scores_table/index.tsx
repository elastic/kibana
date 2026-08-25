/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
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
  EuiToolTip,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/css';
import type {
  EvaluationExperimentDatasetExample,
  EvaluationScoreDocument,
} from '@kbn/evals-common';
import * as i18n from './translations';

const formatScore = (score: number | null | undefined) =>
  score == null ? i18n.SCORE_NOT_AVAILABLE : score.toFixed(2);

const POSITIVE_VERDICTS = [
  'MATCH',
  'CORRECT',
  'ACCURATE',
  'COMPLETE',
  'GROUNDED',
  'RELEVANT',
  'SIMILAR',
  'COHERENT',
] as const;

/**
 * Every positive word above appears inside its own negations, so 'incorrect', 'no-match' and
 * 'ungrounded' have to be recognized before the words they contain. Derived rather than listed
 * so a new positive word cannot be added without its negations.
 */
const NEGATED_VERDICTS = ['NOT_', 'NON_', 'NO_', 'UN', 'IN', 'IR', 'MIS', 'DIS'].flatMap((prefix) =>
  POSITIVE_VERDICTS.map((word) => `${prefix}${word}`)
);

const OTHER_NEGATIVE_VERDICTS = ['MISSING', 'MAJOR', 'SEVERE', 'UNSAFE', 'LEAK'];

/**
 * Maps a verdict label + numeric score to an EUI badge color.
 *
 * A score between 0 and 1 decides the color, because labels are free-form and substring matching
 * cannot be trusted: 'incorrect' contains 'correct', and evaluators name their own scores things
 * like 'correctness-analysis'. Keywords only classify verdicts with no score to read.
 */
export const getVerdictBadgeColor = (label: string, score: number | null | undefined): string => {
  // Fold separators into underscores so 'leak-detected', 'leak detected' and 'n/a' all normalize
  const u = label
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  // Neutral sentinels — shown in muted gray regardless of score. An evaluator that could not
  // judge reports why ('fixture-error', 'unavailable'), which is neither a pass nor a failure.
  if (
    u === 'NOT_APPLICABLE' ||
    u === 'N_A' ||
    u === 'NA' ||
    u === 'UNAVAILABLE' ||
    u.split('_').includes('ERROR')
  )
    return 'default';

  // Only scores on a 0-to-1 scale are judgements. Evaluators also report measurements — latency
  // in seconds, token counts — and against those a 0.8 threshold would call every run a pass.
  if (score != null && score >= 0 && score <= 1) {
    if (score >= 0.8) return 'success';
    if (score >= 0.5) return 'warning';
    return 'danger';
  }

  if (
    NEGATED_VERDICTS.some((verdict) => u.includes(verdict)) ||
    OTHER_NEGATIVE_VERDICTS.some((verdict) => u.includes(verdict)) ||
    u === 'POOR' ||
    u === 'OUT_OF_SCOPE'
  )
    return 'danger';

  if (u.includes('MINOR') || u.includes('PARTIAL')) return 'warning';

  if (
    POSITIVE_VERDICTS.some((verdict) => u.includes(verdict)) ||
    u === 'GOOD' ||
    u === 'SAFE' ||
    u === 'IN_SCOPE'
  )
    return 'success';

  return 'hollow';
};

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

/**
 * A multi-score evaluator namespaces its scores as `evaluator.score`, so the segment before
 * the first dot names the evaluator and the remainder names the individual score.
 */
const splitScoreName = (scoreName: string): { evaluatorName: string; scoreLabel: string } => {
  const separatorIndex = scoreName.indexOf('.');
  if (separatorIndex < 0) {
    return { evaluatorName: scoreName, scoreLabel: scoreName };
  }
  return {
    evaluatorName: scoreName.slice(0, separatorIndex),
    scoreLabel: scoreName.slice(separatorIndex + 1),
  };
};

const collectModelIds = (scores: EvaluationExperimentDatasetExample['scores']): Set<string> =>
  new Set(
    scores
      .map((scoreDoc) => scoreDoc.evaluator.model?.id)
      .filter((modelId): modelId is string => Boolean(modelId))
  );

interface EvaluatorScoreGroup {
  evaluatorName: string;
  scores: EvaluationExperimentDatasetExample['scores'];
  /** Only set when the group's scores agree on one judge, so the group can label itself once. */
  sharedModelId?: string;
}

const groupScoresByEvaluator = (
  scores: EvaluationExperimentDatasetExample['scores']
): EvaluatorScoreGroup[] => {
  const groupsByName = new Map<string, EvaluatorScoreGroup>();

  for (const scoreDoc of scores) {
    const { evaluatorName } = splitScoreName(scoreDoc.evaluator.name);
    const group = groupsByName.get(evaluatorName);
    if (group) {
      group.scores.push(scoreDoc);
      continue;
    }
    groupsByName.set(evaluatorName, { evaluatorName, scores: [scoreDoc] });
  }

  return Array.from(groupsByName.values()).map((group) => {
    const [onlyModelId, ...otherModelIds] = collectModelIds(group.scores);
    return otherModelIds.length === 0 && onlyModelId
      ? { ...group, sharedModelId: onlyModelId }
      : group;
  });
};

const getScoreKey = (scoreDoc: EvaluationScoreDocument, exampleId: string): string =>
  [
    exampleId,
    scoreDoc.evaluator.name,
    scoreDoc.task.repetition_index,
    scoreDoc.task.trace_id ?? 'no_trace',
    scoreDoc['@timestamp'],
  ].join(':');

/**
 * Deliberately not a badge: the badges alongside it are verdicts, and the judge is metadata
 * about who produced them.
 */
const JudgeLabel: React.FC<{ modelId: string }> = ({ modelId }) => (
  <EuiText size="xs" color="subdued">
    <em>{i18n.getJudgedByLabel(modelId)}</em>
  </EuiText>
);

const EvaluatorScoreAccordion: React.FC<{
  score: EvaluationScoreDocument;
  exampleId: string;
  scoreLabel: string;
  judgeModelId?: string;
  onTraceClick: (traceId: string) => void;
}> = ({ score, exampleId, scoreLabel, judgeModelId, onTraceClick }) => {
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
          <strong>{scoreLabel}:</strong> {formatScore(evaluator.score)}
        </EuiText>
      </EuiFlexItem>
      {evaluator.label && (
        <EuiFlexItem grow={false}>
          <EuiBadge color={getVerdictBadgeColor(evaluator.label, evaluator.score)}>
            {evaluator.label}
          </EuiBadge>
        </EuiFlexItem>
      )}
      {judgeModelId && (
        <EuiFlexItem grow={false}>
          <JudgeLabel modelId={judgeModelId} />
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
            <EuiCodeBlock
              overflowHeight={100}
              language="json"
              paddingSize="none"
              transparentBackground
              fontSize="s"
            >
              {JSON.stringify(evaluator.metadata, null, 2)}
            </EuiCodeBlock>
            <EuiSpacer size="xs" />
          </>
        )}
        {hasTraceId && (
          <EuiButtonEmpty
            size="xs"
            iconType="chartWaterfall"
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

const EvaluatorScoreGroupBlock: React.FC<{
  group: EvaluatorScoreGroup;
  exampleId: string;
  showJudge: boolean;
  onTraceClick: (traceId: string) => void;
}> = ({ group, exampleId, showJudge, onTraceClick }) => {
  const { euiTheme } = useEuiTheme();
  const { evaluatorName, scores, sharedModelId } = group;

  // A single-score evaluator needs no heading: the score already carries the evaluator name.
  if (scores.length === 1) {
    const [score] = scores;
    return (
      <EvaluatorScoreAccordion
        score={score}
        exampleId={exampleId}
        scoreLabel={score.evaluator.name}
        judgeModelId={showJudge ? score.evaluator.model?.id : undefined}
        onTraceClick={onTraceClick}
      />
    );
  }

  return (
    <div css={{ marginBottom: euiTheme.size.s }}>
      <EuiText size="xs" color="subdued">
        <strong>{evaluatorName}</strong>
      </EuiText>
      {showJudge && sharedModelId && <JudgeLabel modelId={sharedModelId} />}
      {/* The rule marks where the evaluator's scores end, so the next top-level score is not
          mistaken for one of them. */}
      <div
        css={{
          marginLeft: euiTheme.size.xxs,
          paddingLeft: euiTheme.size.s,
          borderLeft: euiTheme.border.thin,
        }}
      >
        {scores.map((score) => (
          <EvaluatorScoreAccordion
            key={getScoreKey(score, exampleId)}
            score={score}
            exampleId={exampleId}
            scoreLabel={splitScoreName(score.evaluator.name).scoreLabel}
            judgeModelId={
              // The group heading already names a shared judge; only per-score judges are left.
              showJudge && !sharedModelId ? score.evaluator.model?.id : undefined
            }
            onTraceClick={onTraceClick}
          />
        ))}
      </div>
    </div>
  );
};

interface ExampleScoreRow {
  exampleId: string;
  exampleIndex: number | null;
  repetitionIndices: number[];
  scoresByRepetition: Record<number, EvaluationExperimentDatasetExample['scores']>;
}

export interface ExampleScoresTableProps {
  examples: EvaluationExperimentDatasetExample[];
  selectedExampleId?: string | null;
  onTraceClick: (traceId: string, exampleId: string) => void;
}

export const ExampleScoresTable: React.FC<ExampleScoresTableProps> = ({
  examples,
  selectedExampleId,
  onTraceClick,
}) => {
  const { euiTheme } = useEuiTheme();
  const [selectedRepetitions, setSelectedRepetitions] = useState<Record<string, number>>({});

  const selectedRowClassName = useMemo(
    () =>
      css`
        outline: 2px solid ${euiTheme.colors.primary};
        outline-offset: -2px;
      `,
    [euiTheme.colors.primary]
  );

  useEffect(() => {
    if (!selectedExampleId) return;
    const element = document.getElementById(`evalsExampleRow-${selectedExampleId}`);
    element?.scrollIntoView({ block: 'center' });
  }, [selectedExampleId]);

  const rows = useMemo<ExampleScoreRow[]>(() => {
    return [...examples]
      .sort((a, b) => {
        const aIndex = a.example_index ?? null;
        const bIndex = b.example_index ?? null;
        if (aIndex != null && bIndex != null && aIndex !== bIndex) {
          return aIndex - bIndex;
        }
        if (aIndex != null && bIndex == null) return -1;
        if (aIndex == null && bIndex != null) return 1;
        const aNumeric = Number(a.example_id);
        const bNumeric = Number(b.example_id);
        if (Number.isFinite(aNumeric) && Number.isFinite(bNumeric) && aNumeric !== bNumeric) {
          return aNumeric - bNumeric;
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
          Record<number, EvaluationExperimentDatasetExample['scores']>
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
          exampleIndex: example.example_index ?? null,
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
  ): EvaluationExperimentDatasetExample['scores'] => {
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
      <EuiCodeBlock
        // Table cell content is a flex container, so without an explicit width the block
        // shrink-wraps the JSON and pulls its copy/expand controls in with it.
        css={{ width: '100%' }}
        overflowHeight={200}
        language="json"
        paddingSize="none"
        transparentBackground
        fontSize="s"
        isCopyable
      >
        {serializedValue}
      </EuiCodeBlock>
    );
  };

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
      width: '160px',
      render: (exampleId: string, row: ExampleScoreRow) => {
        // Numeric-only IDs (auto-generated) get a 1-based "#N" label for readability.
        // Descriptive/string IDs (e.g. content hashes) are shown in full. Long ids
        // wrap within the column rather than being truncated.
        const isNumericFallback = /^\d+$/.test(exampleId);
        const label = isNumericFallback
          ? `#${(row.exampleIndex ?? Number(exampleId)) + 1}`
          : exampleId;
        return (
          <EuiText size="s" css={{ fontFamily: euiTheme.font.familyCode, wordBreak: 'break-all' }}>
            {label}
          </EuiText>
        );
      },
    },
    {
      field: 'scoresByRepetition',
      name: i18n.COLUMN_INPUT,
      width: '18%',
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
      width: '30%',
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
      width: '30%',
      render: (
        _scoresByRepetition: ExampleScoreRow['scoresByRepetition'],
        row: ExampleScoreRow
      ) => {
        const scores = getScoresForSelectedRepetition(row);
        // A judge only disambiguates when the cell holds more than one.
        const showJudge = collectModelIds(scores).size > 1;
        const groups = groupScoresByEvaluator(scores);
        return scores.length > 0 ? (
          <div>
            {groups.map((group, idx) => (
              <React.Fragment key={`${row.exampleId}-${group.evaluatorName}`}>
                {idx > 0 && <EuiSpacer size="xs" />}
                <EvaluatorScoreGroupBlock
                  group={group}
                  exampleId={row.exampleId}
                  showJudge={showJudge}
                  onTraceClick={(traceId) => onTraceClick(traceId, row.exampleId)}
                />
              </React.Fragment>
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
                <EuiToolTip
                  content={i18n.getTraceButtonAriaLabel(traceId)}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    size="s"
                    iconType="chartWaterfall"
                    onClick={() => onTraceClick(traceId, row.exampleId)}
                    aria-label={i18n.getTraceButtonAriaLabel(traceId)}
                  />
                </EuiToolTip>
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
      tableLayout="auto"
      noItemsMessage={i18n.EMPTY_TABLE_MESSAGE}
      tableCaption={i18n.TABLE_CAPTION}
      rowProps={(row) => ({
        id: `evalsExampleRow-${row.exampleId}`,
        className:
          selectedExampleId && row.exampleId === selectedExampleId
            ? selectedRowClassName
            : undefined,
      })}
    />
  );
};
