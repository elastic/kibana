/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { css } from '@emotion/react';
import { useEuiTheme, EuiInMemoryTable } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { SendMessageProvider } from '../../context/send_message/send_message_context';
import { EvaluationsProvider } from '../../context/evaluations/evaluations_context';
import {
  useConversationsWithEvals,
  type ConversationEvaluationSummary,
} from './hooks/use_conversations_with_evals';
import { EvaluatorBadgesAverage } from './evaluation_badges_average';

export const OnechatEvaluationsHistoryView: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { evaluationSummaries, isLoading } = useConversationsWithEvals();

  const columns: Array<EuiBasicTableColumn<ConversationEvaluationSummary>> = [
    {
      field: 'title',
      name: 'Title',
      sortable: true,
    },
    {
      field: 'conversationId',
      name: 'Conversation ID',
      sortable: true,
    },
    {
      field: 'agentId',
      name: 'Agent ID',
      sortable: true,
    },
    {
      field: 'createdAt',
      name: 'Created At',
      sortable: true,
    },
    {
      field: 'averageMetrics',
      name: 'Average Metrics',
      render: (metrics: ConversationEvaluationSummary['averageMetrics']) => {
        // Convert metrics array to individual score props for the component
        const scores = metrics.reduce((acc, metric) => {
          acc[`${metric.evaluatorId}Score`] = metric.score;
          return acc;
        }, {} as Record<string, number>);

        return (
          <EvaluatorBadgesAverage
            relevanceScore={scores.relevanceScore}
            precisionScore={scores.precisionScore}
            recallScore={scores.recallScore}
            groundednessScore={scores.groundednessScore}
            regexScore={scores.regexScore}
            criteriaScore={scores.criteriaScore}
            direction="column"
          />
        );
      },
    },
    {
      field: 'qualitativeReview',
      name: 'Qualitative Review',
    },
    {
      field: 'recommendations',
      name: 'Recommendations',
    },
  ];

  return (
    <SendMessageProvider>
      <EvaluationsProvider>
        <KibanaPageTemplate data-test-subj="agentBuilderEvaluationHistoryPage">
          <KibanaPageTemplate.Header
            pageTitle={<h1>Evaluations History</h1>}
            description={<p>View the history of evaluations for all conversations.</p>}
            css={css`
              background-color: ${euiTheme.colors.backgroundBasePlain};
              border-block-end: none;
            `}
          />
          <KibanaPageTemplate.Section>
            <EuiInMemoryTable
              items={evaluationSummaries}
              itemId={(item) => item.conversationId}
              columns={columns}
              sorting={true}
              loading={isLoading}
              css={css`
                border: ${euiTheme.border.thin};
                border-radius: ${euiTheme.border.radius.medium};
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                background-color: ${euiTheme.colors.emptyShade};

                .euiTable {
                  background-color: transparent;
                }

                .euiTableHeaderCell {
                  background-color: ${euiTheme.colors.lightestShade};
                  border-bottom: ${euiTheme.border.thin};
                  font-weight: 600;
                }

                .euiTableRow {
                  &:hover {
                    background-color: ${euiTheme.colors.lightestShade};
                  }
                }

                .euiTableRowCell {
                  border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
                }
              `}
            />
          </KibanaPageTemplate.Section>
        </KibanaPageTemplate>
      </EvaluationsProvider>
    </SendMessageProvider>
  );
};
