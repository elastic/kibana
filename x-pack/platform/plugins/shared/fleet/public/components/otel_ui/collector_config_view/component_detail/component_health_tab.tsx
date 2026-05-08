/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiDescriptionList, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedRelative } from '@kbn/i18n-react';

import type { ComponentHealth } from '../../../../../common/types';
import { getComponentHealthStatus, getHealthStatusLabel, HEALTH_STATUS_COLORS } from '../utils';

interface ComponentHealthTabProps {
  componentHealth?: ComponentHealth;
}

export const ComponentHealthTab: React.FunctionComponent<ComponentHealthTabProps> = ({
  componentHealth,
}) => {
  if (!componentHealth) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="otelComponentDetailHealthNoData">
        {i18n.translate('xpack.fleet.otelUi.componentDetail.health.noData', {
          defaultMessage: 'No health data available',
        })}
      </EuiText>
    );
  }

  const healthStatus = getComponentHealthStatus(componentHealth);

  return (
    <EuiDescriptionList
      compressed
      type="column"
      data-test-subj="otelComponentDetailHealth"
      listItems={[
        {
          title: i18n.translate('xpack.fleet.otelUi.componentDetail.health.statusLabel', {
            defaultMessage: 'Status',
          }),
          description: (
            <EuiBadge color={HEALTH_STATUS_COLORS[healthStatus]}>
              {getHealthStatusLabel(healthStatus)}
            </EuiBadge>
          ),
        },
        {
          title: i18n.translate('xpack.fleet.otelUi.componentDetail.health.reportedStatusLabel', {
            defaultMessage: 'Reported status',
          }),
          description: componentHealth.status || '-',
        },
        {
          title: i18n.translate('xpack.fleet.otelUi.componentDetail.health.lastUpdatedLabel', {
            defaultMessage: 'Last updated',
          }),
          description: componentHealth.status_time_unix_nano ? (
            <EuiToolTip
              content={
                <FormattedDate
                  value={componentHealth.status_time_unix_nano / 1_000_000}
                  year="numeric"
                  month="short"
                  day="2-digit"
                  hour="numeric"
                  minute="numeric"
                  timeZoneName="short"
                />
              }
            >
              <span tabIndex={0}>
                <FormattedRelative value={componentHealth.status_time_unix_nano / 1_000_000} />
              </span>
            </EuiToolTip>
          ) : (
            '-'
          ),
        },
      ]}
    />
  );
};
