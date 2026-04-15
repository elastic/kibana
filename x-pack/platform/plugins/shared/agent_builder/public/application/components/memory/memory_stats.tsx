/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiProgress,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import { useMemoryStats } from '../../hooks/memory/use_memory_stats';
import { useMemoryConsolidation } from '../../hooks/memory/use_memory_list';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../utils/app_paths';

const STATUS_ORDER = [
  'candidate',
  'provisional',
  'established',
  'consolidated',
  'suspect',
  'deprecated',
];

const STATUS_COLORS: Record<string, string> = {
  candidate: 'subdued',
  provisional: 'warning',
  established: 'success',
  consolidated: 'primary',
  suspect: 'danger',
  deprecated: 'subdued',
};

export const AgentBuilderMemoryStats: React.FC = () => {
  const { stats, isLoading, refetchStats } = useMemoryStats();
  const { triggerConsolidation, isTriggering } = useMemoryConsolidation();
  const { createAgentBuilderUrl } = useNavigation();

  const reviewQueueUrl = createAgentBuilderUrl(appPaths.manage.memoryReview);

  return (
    <KibanaPageTemplate data-test-subj="agentBuilderMemoryStatsPage">
      <KibanaPageTemplate.Header
        pageTitle={i18n.translate('xpack.agentBuilder.memory.stats.pageTitle', {
          defaultMessage: 'Memory Statistics',
        })}
        description={i18n.translate('xpack.agentBuilder.memory.stats.pageDescription', {
          defaultMessage:
            'Overview of the memory system: counts by type, status distribution, and review queue.',
        })}
        css={({ euiTheme }: { euiTheme: { colors: { backgroundBasePlain: string } } }) => ({
          backgroundColor: euiTheme.colors.backgroundBasePlain,
          borderBlockEnd: 'none',
        })}
        rightSideItems={[
          <EuiButton
            key="consolidate"
            iconType="bolt"
            onClick={triggerConsolidation}
            isLoading={isTriggering}
            data-test-subj="agentBuilderMemoryStatsTriggerConsolidation"
          >
            {i18n.translate('xpack.agentBuilder.memory.stats.consolidateButton', {
              defaultMessage: 'Trigger consolidation',
            })}
          </EuiButton>,
          <EuiButton
            key="refresh"
            iconType="refresh"
            onClick={() => refetchStats()}
            isLoading={isLoading}
            data-test-subj="agentBuilderMemoryStatsRefresh"
          >
            {i18n.translate('xpack.agentBuilder.memory.stats.refreshButton', {
              defaultMessage: 'Refresh',
            })}
          </EuiButton>,
        ]}
      />
      <KibanaPageTemplate.Section>
        {isLoading ? (
          <EuiFlexGroup justifyContent="center">
            <EuiLoadingSpinner size="l" />
          </EuiFlexGroup>
        ) : (
          <>
            {/* Total + by-type cards */}
            <EuiFlexGroup wrap gutterSize="l">
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={String(stats?.total ?? 0)}
                  description={i18n.translate('xpack.agentBuilder.memory.stats.total', {
                    defaultMessage: 'Total memories',
                  })}
                  titleColor="default"
                  data-test-subj="agentBuilderMemoryStatsTotal"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={String(stats?.by_type?.semantic ?? 0)}
                  description={i18n.translate('xpack.agentBuilder.memory.stats.semantic', {
                    defaultMessage: 'Semantic',
                  })}
                  titleColor="primary"
                  data-test-subj="agentBuilderMemoryStatsSemantic"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={String(stats?.by_type?.episodic ?? 0)}
                  description={i18n.translate('xpack.agentBuilder.memory.stats.episodic', {
                    defaultMessage: 'Episodic',
                  })}
                  titleColor="accent"
                  data-test-subj="agentBuilderMemoryStatsEpisodic"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={String(stats?.by_type?.procedural ?? 0)}
                  description={i18n.translate('xpack.agentBuilder.memory.stats.procedural', {
                    defaultMessage: 'Procedural',
                  })}
                  titleColor="success"
                  data-test-subj="agentBuilderMemoryStatsProcedural"
                />
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="xl" />

            {/* By-status breakdown */}
            <EuiTitle size="s">
              <h3>
                {i18n.translate('xpack.agentBuilder.memory.stats.byStatus', {
                  defaultMessage: 'By status',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />

            <EuiFlexGroup direction="column" gutterSize="s" style={{ maxWidth: 500 }}>
              {STATUS_ORDER.map((status) => {
                const statusCount =
                  (stats as { by_status?: Record<string, number> } | undefined)?.by_status?.[
                    status
                  ] ?? 0;
                const total = stats?.total ?? 1;
                const percentage = total > 0 ? Math.round((statusCount / total) * 100) : 0;
                return (
                  <EuiFlexItem key={status}>
                    <EuiFlexGroup alignItems="center" gutterSize="m">
                      <EuiFlexItem grow={false} style={{ width: 120 }}>
                        <EuiText size="s">
                          <strong>{status}</strong>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={true}>
                        <EuiProgress
                          value={percentage}
                          max={100}
                          size="s"
                          color={STATUS_COLORS[status] ?? 'primary'}
                          label={`${statusCount} (${percentage}%)`}
                          data-test-subj={`agentBuilderMemoryStatsStatus-${status}`}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false} style={{ width: 70 }}>
                        <EuiText size="s" color="subdued" textAlign="right">
                          {statusCount}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>

            <EuiSpacer size="xl" />

            {/* Review queue badge */}
            <EuiTitle size="s">
              <h3>
                {i18n.translate('xpack.agentBuilder.memory.stats.reviewQueue', {
                  defaultMessage: 'Review queue',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s">
              {i18n.translate('xpack.agentBuilder.memory.stats.reviewQueueDescription', {
                defaultMessage: 'Memories that have been flagged for human review.',
              })}{' '}
              <EuiLink href={reviewQueueUrl} data-test-subj="agentBuilderMemoryStatsReviewLink">
                {i18n.translate('xpack.agentBuilder.memory.stats.reviewQueueLink', {
                  defaultMessage: 'Go to review queue',
                })}
              </EuiLink>
            </EuiText>
          </>
        )}
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
