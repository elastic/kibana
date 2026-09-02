/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useRunQuotas, useRunQuotaStatus } from '../../../hooks/use_significant_events_run_quotas';
import { useSignificantEventsAppRouter } from '../../../hooks/use_significant_events_app_router';
import { RUN_BUDGET_GROUP_LABELS } from './settings/run_limits_section';

export const RunLimitsBanner = () => {
  const router = useSignificantEventsAppRouter();
  const quotas = useRunQuotas();
  const status = useRunQuotaStatus();

  if (!status.data?.enabled || !quotas.data) {
    return null;
  }

  const reachedGroups = quotas.data.groups.filter(
    ({ limit, counted }) => limit.enabled && counted >= limit.max
  );
  if (reachedGroups.length === 0) {
    return null;
  }

  const reached = i18n.formatList(
    'conjunction',
    reachedGroups.map(({ group, counted, limit }) =>
      i18n.translate('xpack.significantEventsApp.runLimitsBanner.reachedGroupDetail', {
        defaultMessage: '{group} ({counted} counted of {limit})',
        values: {
          group: RUN_BUDGET_GROUP_LABELS[group],
          counted,
          limit: limit.enabled ? limit.max : 0,
        },
      })
    )
  );

  return (
    <>
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
              'Current deployment-wide usage: {reached}. New scheduled work in these groups can be denied until the counters reset. Work already admitted can finish, and gate failures fail open. Run limits do not apply to manual runs.',
            values: { reached },
          })}
        </p>
        {status.data.canManageLimits ? (
          <EuiButton
            color="warning"
            size="s"
            href={router.link('/{tab}', { path: { tab: 'settings' } })}
          >
            {i18n.translate('xpack.significantEventsApp.runLimitsBanner.manageButtonLabel', {
              defaultMessage: 'Review run limits',
            })}
          </EuiButton>
        ) : (
          <p>
            {i18n.translate('xpack.significantEventsApp.runLimitsBanner.readOnlyDescription', {
              defaultMessage:
                'An administrator with the Streams manage privilege in every space can change these limits.',
            })}
          </p>
        )}
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
