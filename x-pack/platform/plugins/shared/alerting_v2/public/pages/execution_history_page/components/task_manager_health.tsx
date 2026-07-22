/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiStat,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const MOCK_HEALTH = {
  status: 'OK' as const,
  score: 92,
  avgDrift: '1.2s',
  avgDuration: '450ms',
  pollingRate: '3s',
  claimedTasks: 847,
  capacity: 1000,
};

const statusColor: Record<string, string> = {
  OK: 'success',
  Warning: 'warning',
  Error: 'danger',
};

export const TaskManagerHealth: React.FC = () => {
  const accordionId = useGeneratedHtmlId({ prefix: 'taskManagerHealth' });

  const buttonContent = (
    <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <h3>
            {i18n.translate('xpack.alertingV2.executionHistory.taskManagerHealth.title', {
              defaultMessage: 'Task Manager Health',
            })}
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color={statusColor[MOCK_HEALTH.status] ?? 'default'}>
          {MOCK_HEALTH.status}
        </EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="success">
          <strong>{MOCK_HEALTH.score}%</strong>{' '}
          <EuiText size="xs" color="subdued" css={css({ display: 'inline' })}>
            {i18n.translate(
              'xpack.alertingV2.executionHistory.taskManagerHealth.healthScoreInline',
              { defaultMessage: 'health' }
            )}
          </EuiText>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>{MOCK_HEALTH.claimedTasks}/{MOCK_HEALTH.capacity}</strong>{' '}
          <EuiText size="xs" color="subdued" css={css({ display: 'inline' })}>
            {i18n.translate(
              'xpack.alertingV2.executionHistory.taskManagerHealth.capacityInline',
              { defaultMessage: 'capacity' }
            )}
          </EuiText>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiPanel hasBorder>
      <EuiAccordion
        id={accordionId}
        buttonContent={buttonContent}
        initialIsOpen={false}
        css={css`
          .euiAccordion__triggerWrapper {
            padding: 0;
          }
        `}
      >
        <div css={css({ paddingTop: 16 })}>
          <EuiTitle size="xxxs">
            <h4>
              {i18n.translate('xpack.alertingV2.executionHistory.taskManagerHealth.statsTitle', {
                defaultMessage: 'Performance',
              })}
            </h4>
          </EuiTitle>
          <EuiFlexGroup gutterSize="m" responsive={false} wrap>
            <EuiFlexItem>
              <EuiStat
                title={`${MOCK_HEALTH.score}%`}
                description={i18n.translate(
                  'xpack.alertingV2.executionHistory.taskManagerHealth.healthScore',
                  { defaultMessage: 'Health score' }
                )}
                textAlign="left"
                titleColor="success"
                reverse
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={MOCK_HEALTH.avgDrift}
                description={i18n.translate(
                  'xpack.alertingV2.executionHistory.taskManagerHealth.avgDrift',
                  { defaultMessage: 'Avg drift' }
                )}
                textAlign="left"
                reverse
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={MOCK_HEALTH.avgDuration}
                description={i18n.translate(
                  'xpack.alertingV2.executionHistory.taskManagerHealth.avgDuration',
                  { defaultMessage: 'Avg duration' }
                )}
                textAlign="left"
                reverse
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={MOCK_HEALTH.pollingRate}
                description={i18n.translate(
                  'xpack.alertingV2.executionHistory.taskManagerHealth.pollingRate',
                  { defaultMessage: 'Polling rate' }
                )}
                textAlign="left"
                reverse
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={`${MOCK_HEALTH.claimedTasks} / ${MOCK_HEALTH.capacity}`}
                description={i18n.translate(
                  'xpack.alertingV2.executionHistory.taskManagerHealth.capacity',
                  { defaultMessage: 'Capacity' }
                )}
                textAlign="left"
                reverse
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiAccordion>
    </EuiPanel>
  );
};
