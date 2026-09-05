/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RunQuotaGroup } from '@kbn/significant-events-plugin/common';
import { useRunQuotas } from '../../../hooks/use_significant_events_run_quotas';
import { useSignificantEventsAppRouter } from '../../../hooks/use_significant_events_app_router';
import { isFiniteRunLimit, RUN_QUOTA_GROUPS, type RunLimitDraft } from './settings/run_limit_draft';
import { RUN_QUOTA_GROUP_LABELS } from './settings/run_limit_row';

interface RunQuotaExhaustionCalloutProps {
  enabled: boolean;
  limits: Record<RunQuotaGroup, RunLimitDraft>;
  counts: Record<RunQuotaGroup, number>;
  canManage?: boolean;
  manageHref?: string;
}

export const getExhaustedRunQuotaGroups = ({
  enabled,
  limits,
  counts,
}: Pick<RunQuotaExhaustionCalloutProps, 'enabled' | 'limits' | 'counts'>): RunQuotaGroup[] =>
  enabled
    ? RUN_QUOTA_GROUPS.filter(
        (group) => isFiniteRunLimit(limits[group]) && counts[group] >= limits[group]
      )
    : [];

export const RunQuotaExhaustionCallout = ({
  enabled,
  limits,
  counts,
  canManage,
  manageHref,
}: RunQuotaExhaustionCalloutProps) => {
  const exhaustedGroups = getExhaustedRunQuotaGroups({ enabled, limits, counts });
  if (exhaustedGroups.length === 0) {
    return null;
  }

  const reached = i18n.formatList(
    'conjunction',
    exhaustedGroups.map((group) =>
      i18n.translate('xpack.significantEventsApp.runLimitsBanner.reachedGroupDetail', {
        defaultMessage: '{group}: {count} counted scheduled admissions, daily limit {limit}',
        values: {
          group: RUN_QUOTA_GROUP_LABELS[group],
          count: counts[group],
          limit: limits[group],
        },
      })
    )
  );

  return (
    <EuiCallOut
      color="warning"
      iconType="warning"
      data-test-subj="significantEventsRunLimitsBanner"
      title={i18n.translate('xpack.significantEventsApp.runLimitsBanner.title', {
        defaultMessage: 'Scheduled automation has reached a daily run limit',
      })}
    >
      <p>
        {i18n.translate('xpack.significantEventsApp.runLimitsBanner.description', {
          defaultMessage:
            'Reached limits: {reached}. New non-critical scheduled admissions in these categories can be denied until the UTC day resets. Critical scheduled investigations continue, and manual runs are not limited.',
          values: { reached },
        })}
      </p>
      {manageHref && canManage && (
        <EuiButton color="warning" size="s" href={manageHref}>
          {i18n.translate('xpack.significantEventsApp.runLimitsBanner.manageButtonLabel', {
            defaultMessage: 'Review run limits',
          })}
        </EuiButton>
      )}
      {manageHref && !canManage && (
        <p>
          {i18n.translate('xpack.significantEventsApp.runLimitsBanner.readOnlyDescription', {
            defaultMessage:
              'An administrator with the Streams manage privilege in every space can change these limits.',
          })}
        </p>
      )}
    </EuiCallOut>
  );
};

export const RunLimitsBanner = () => {
  const router = useSignificantEventsAppRouter();
  const { data } = useRunQuotas();

  if (
    !data ||
    getExhaustedRunQuotaGroups({
      enabled: data.enabled,
      limits: data.limits,
      counts: data.counts,
    }).length === 0
  ) {
    return null;
  }

  return (
    <>
      <RunQuotaExhaustionCallout
        enabled={data.enabled}
        limits={data.limits}
        counts={data.counts}
        canManage={data.canManage}
        manageHref={router.link('/{tab}', { path: { tab: 'settings' } })}
      />
      <EuiSpacer />
    </>
  );
};
