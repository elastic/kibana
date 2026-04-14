/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLink,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import React, { useMemo } from 'react';
import { SparkPlot } from '../../../../spark_plot';
import { getConfidenceColor } from '../../../stream_detail_significant_events_view/utils/get_confidence_color';
import { KnowledgeIndicatorActionsCell } from '../../../stream_detail_significant_events_view/knowledge_indicator_actions_cell';
import { getKnowledgeIndicatorItemId } from '../../../stream_detail_significant_events_view/utils/get_knowledge_indicator_item_id';
import { getKnowledgeIndicatorStreamName } from '../../../stream_detail_significant_events_view/utils/get_knowledge_indicator_stream_name';
import {
  BACKED_STATUS_COLUMN,
  PROMOTED_BADGE_LABEL,
  NOT_PROMOTED_BADGE_LABEL,
  PROMOTED_TOOLTIP_CONTENT,
  NOT_PROMOTED_TOOLTIP_CONTENT,
} from '../queries_table/translations';
import { getKnowledgeIndicatorTitle } from './use_knowledge_indicators_table';
import {
  TITLE_COLUMN_LABEL,
  EVENTS_COLUMN_LABEL,
  TYPE_COLUMN_LABEL,
  QUERY_TYPE_LABEL,
  CONFIDENCE_COLUMN_LABEL,
  STREAM_COLUMN_LABEL,
  ACTIONS_COLUMN_LABEL,
  VIEW_DETAILS_ARIA_LABEL,
  MINIMIZE_DETAILS_ARIA_LABEL,
  OCCURRENCES_TOOLTIP_NAME,
} from './translations';

const EMPTY_ANNOTATIONS: never[] = [];
const capitalizeStyle = css`
  text-transform: capitalize;
`;

interface UseKnowledgeIndicatorsColumnsParams {
  occurrencesByQueryId: Record<string, Array<{ x: number; y: number }>>;
  selectedKnowledgeIndicatorId: string | undefined;
  toggleSelectedKnowledgeIndicator: (ki: KnowledgeIndicator) => void;
  setKnowledgeIndicatorsToDelete: (items: KnowledgeIndicator[]) => void;
}

export const useKnowledgeIndicatorsColumns = ({
  occurrencesByQueryId,
  selectedKnowledgeIndicatorId,
  toggleSelectedKnowledgeIndicator,
  setKnowledgeIndicatorsToDelete,
}: UseKnowledgeIndicatorsColumnsParams) =>
  useMemo<Array<EuiBasicTableColumn<KnowledgeIndicator>>>(
    () => [
      {
        name: TITLE_COLUMN_LABEL,
        truncateText: true,
        render: (ki: KnowledgeIndicator) => {
          const title = getKnowledgeIndicatorTitle(ki);
          const isExpanded = selectedKnowledgeIndicatorId === getKnowledgeIndicatorItemId(ki);

          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  data-test-subj="knowledgeIndicatorsDetailsButton"
                  iconType={isExpanded ? 'minimize' : 'expand'}
                  aria-label={isExpanded ? MINIMIZE_DETAILS_ARIA_LABEL : VIEW_DETAILS_ARIA_LABEL}
                  onClick={() => toggleSelectedKnowledgeIndicator(ki)}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiLink onClick={() => toggleSelectedKnowledgeIndicator(ki)}>{title}</EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        name: EVENTS_COLUMN_LABEL,
        width: '110px',
        render: (ki: KnowledgeIndicator) => {
          if (ki.kind !== 'query' || !ki.rule.backed) {
            return null;
          }

          const occurrences = occurrencesByQueryId[ki.query.id];
          if (!occurrences) return null;

          return (
            <SparkPlot
              id={`ki-events-${ki.query.id}`}
              name={OCCURRENCES_TOOLTIP_NAME}
              type="bar"
              timeseries={occurrences}
              annotations={EMPTY_ANNOTATIONS}
              compressed
              hideAxis
              height={32}
            />
          );
        },
      },
      {
        name: TYPE_COLUMN_LABEL,
        width: '90px',
        render: (ki: KnowledgeIndicator) => {
          if (ki.kind === 'feature') {
            return (
              <EuiBadge color="hollow" css={capitalizeStyle}>
                {ki.feature.type}
              </EuiBadge>
            );
          }
          return <EuiBadge color="hollow">{QUERY_TYPE_LABEL}</EuiBadge>;
        },
      },
      {
        name: CONFIDENCE_COLUMN_LABEL,
        width: '70px',
        render: (ki: KnowledgeIndicator) => {
          if (ki.kind !== 'feature') return null;
          return (
            <EuiHealth color={getConfidenceColor(ki.feature.confidence)}>
              {ki.feature.confidence}
            </EuiHealth>
          );
        },
      },
      {
        name: STREAM_COLUMN_LABEL,
        width: '110px',
        render: (ki: KnowledgeIndicator) => {
          return <EuiBadge color="hollow">{getKnowledgeIndicatorStreamName(ki)}</EuiBadge>;
        },
      },
      {
        name: BACKED_STATUS_COLUMN,
        width: '100px',
        render: (ki: KnowledgeIndicator) => {
          if (ki.kind !== 'query') return null;
          return (
            <EuiToolTip
              content={ki.rule.backed ? PROMOTED_TOOLTIP_CONTENT : NOT_PROMOTED_TOOLTIP_CONTENT}
            >
              <span tabIndex={0}>
                <EuiBadge color={ki.rule.backed ? 'hollow' : 'warning'}>
                  {ki.rule.backed ? PROMOTED_BADGE_LABEL : NOT_PROMOTED_BADGE_LABEL}
                </EuiBadge>
              </span>
            </EuiToolTip>
          );
        },
      },
      {
        name: ACTIONS_COLUMN_LABEL,
        width: '60px',
        align: 'right',
        render: (ki: KnowledgeIndicator) => (
          <KnowledgeIndicatorActionsCell
            streamName={getKnowledgeIndicatorStreamName(ki)}
            knowledgeIndicator={ki}
            onDeleteRequest={(item) => setKnowledgeIndicatorsToDelete([item])}
          />
        ),
      },
    ],
    [
      occurrencesByQueryId,
      selectedKnowledgeIndicatorId,
      toggleSelectedKnowledgeIndicator,
      setKnowledgeIndicatorsToDelete,
    ]
  );
