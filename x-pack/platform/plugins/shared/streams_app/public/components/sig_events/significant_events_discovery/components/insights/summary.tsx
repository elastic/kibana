/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { TaskStatus } from '@kbn/streams-schema';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Insight, InsightImpactLevel } from '@kbn/streams-schema';
import { AssetImage } from '../../../../asset_image';
import type { InsightsDiscoveryState } from '../../../../../hooks/sig_events/use_insights_discovery';
import { impactBadgeColors, impactLabels } from './insight_constants';
import { InsightFlyout } from './insight_flyout';
import { formatGeneratedAt } from './utils';

export function Summary({
  count,
  discoveryState,
}: {
  count: number;
  discoveryState: InsightsDiscoveryState;
}) {
  const { euiTheme } = useEuiTheme();
  const { insights, task, isTaskPending, scheduleTask, cancelTask, isCancellingTask } =
    discoveryState;

  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);

  // Clear selected insight when a new discovery run starts (insights reset to null).
  const previousInsightsRef = useRef(insights);
  useEffect(() => {
    if (previousInsightsRef.current !== null && insights === null) {
      setSelectedInsight(null);
    }
    previousInsightsRef.current = insights;
  }, [insights]);

  const handleSelectInsight = useCallback((insight: Insight) => setSelectedInsight(insight), []);
  const handleCloseFlyout = useCallback(() => setSelectedInsight(null), []);

  const columns = useMemo<Array<EuiBasicTableColumn<Insight>>>(
    () => [
      {
        field: 'id',
        name: '',
        width: '40px',
        render: (_: string, insight: Insight) => {
          const isSelected = selectedInsight?.id === insight.id;
          return (
            <EuiButtonIcon
              data-test-subj="streamsInsightExpandButton"
              iconType={isSelected ? 'minimize' : 'expand'}
              aria-label={
                isSelected
                  ? i18n.translate('xpack.streams.insights.table.minimizeAriaLabel', {
                      defaultMessage: 'Close insight details',
                    })
                  : i18n.translate('xpack.streams.insights.table.expandAriaLabel', {
                      defaultMessage: 'View insight details',
                    })
              }
              onClick={() => (isSelected ? handleCloseFlyout() : handleSelectInsight(insight))}
            />
          );
        },
      },
      {
        field: 'title',
        name: i18n.translate('xpack.streams.insights.table.titleColumn', {
          defaultMessage: 'Significant event',
        }),
        render: (title: string, insight: Insight) => (
          <EuiFlexGroup
            direction="column"
            gutterSize="xs"
            css={css`
              max-width: 100%;
              overflow: hidden;
            `}
          >
            <EuiFlexItem>
              <EuiLink
                onClick={() => handleSelectInsight(insight)}
                data-test-subj="streamsInsightTitleLink"
                title={title}
                css={css`
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  display: block;
                  max-width: 100%;
                `}
              >
                {title}
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText
                size="xs"
                color="subdued"
                title={insight.description}
                css={css`
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  max-width: 100%;
                  display: block;
                  width: 100%;
                `}
              >
                {insight.description}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'impact',
        name: i18n.translate('xpack.streams.insights.table.severityColumn', {
          defaultMessage: 'Severity',
        }),
        width: '120px',
        render: (impact: InsightImpactLevel) => (
          <EuiBadge color={impactBadgeColors[impact]}>{impactLabels[impact]}</EuiBadge>
        ),
      },
      {
        field: 'generated_at',
        name: i18n.translate('xpack.streams.insights.table.generatedAtColumn', {
          defaultMessage: 'Discovered',
        }),
        width: '180px',
        render: (generatedAt: string) => (
          <EuiText size="s" color="subdued">
            {formatGeneratedAt(generatedAt)}
          </EuiText>
        ),
      },
    ],
    [handleSelectInsight, handleCloseFlyout, selectedInsight]
  );

  if (insights && insights.length > 0) {
    return (
      <>
        <EuiBasicTable
          data-test-subj="streamsInsightsTable"
          columns={columns}
          items={insights}
          itemId="id"
          tableLayout="fixed"
          rowProps={(insight: Insight) => ({
            style: {
              height: '68px',
              background:
                selectedInsight?.id === insight.id
                  ? euiTheme.colors.backgroundBaseInteractiveSelect
                  : undefined,
            },
          })}
        />
        {selectedInsight && (
          <InsightFlyout insight={selectedInsight} onClose={handleCloseFlyout} />
        )}
      </>
    );
  }

  return (
    <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiPanel color="subdued" paddingSize="l">
          <EuiFlexGroup
            direction="column"
            alignItems="center"
            justifyContent="center"
            style={{ minHeight: '30vh', minWidth: '40vh' }}
          >
            <EuiFlexItem grow={false}>
              <AssetImage type="significantEventsEmptyState" size="m" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h2>
                  {i18n.translate(
                    'xpack.streams.sigEventsDiscovery.insightsTab.significantEventsFoundTitle',
                    {
                      defaultMessage:
                        '{count} {count, plural, one {event} other {events}} detected',
                      values: { count },
                    }
                  )}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" textAlign="center" css={{ maxWidth: 400 }}>
                {i18n.translate(
                  'xpack.streams.sigEventsDiscovery.insightsTab.significantEventsFoundDescription',
                  {
                    defaultMessage:
                      'Discover Significant Events from your logs, and understand what they mean with the power of AI and Elastic Observability.',
                  }
                )}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiButton
                  fill
                  size="m"
                  iconType="sparkles"
                  onClick={() => scheduleTask()}
                  isDisabled={isTaskPending}
                  isLoading={isTaskPending}
                  data-test-subj="significant_events_generate_insights_button"
                >
                  {task?.status === TaskStatus.InProgress
                    ? i18n.translate('xpack.streams.insights.generatingButtonLabel', {
                        defaultMessage: 'Discovering Significant Events',
                      })
                    : i18n.translate('xpack.streams.insights.generateButtonLabel', {
                        defaultMessage: 'Discover Significant Events',
                      })}
                </EuiButton>
                {(task?.status === TaskStatus.InProgress || isCancellingTask) && (
                  <EuiButton
                    onClick={cancelTask}
                    isDisabled={isCancellingTask}
                    data-test-subj="significant_events_cancel_insights_generation_button"
                  >
                    {isCancellingTask
                      ? i18n.translate('xpack.streams.insights.cancellingTaskButtonLabel', {
                          defaultMessage: 'Cancelling',
                        })
                      : i18n.translate('xpack.streams.insights.cancelTaskButtonLabel', {
                          defaultMessage: 'Cancel',
                        })}
                  </EuiButton>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
