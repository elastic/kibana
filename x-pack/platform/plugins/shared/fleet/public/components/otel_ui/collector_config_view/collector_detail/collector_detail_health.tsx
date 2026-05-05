/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedRelative } from '@kbn/i18n-react';

import type { ComponentHealth } from '../../../../../common/types';
import { getComponentHealthStatus, getHealthStatusLabel, HEALTH_STATUS_COLORS } from '../utils';

interface CollectorDetailHealthProps {
  health?: ComponentHealth;
}

const FormattedTimestamp: React.FC<{ nanos: number }> = ({ nanos }) => {
  const ms = nanos / 1_000_000;
  return (
    <EuiToolTip
      content={
        <FormattedDate
          value={ms}
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
        <FormattedRelative value={ms} />
      </span>
    </EuiToolTip>
  );
};

export const CollectorDetailHealth: React.FC<CollectorDetailHealthProps> = ({ health }) => {
  if (!health) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="collectorDetailHealthNoData">
        {i18n.translate('xpack.fleet.otelUi.collectorDetail.health.noData', {
          defaultMessage: 'No health data available',
        })}
      </EuiText>
    );
  }

  const overallStatus = getComponentHealthStatus(health);
  const componentEntries = Object.entries(health.component_health_map ?? {});

  return (
    <>
      <EuiDescriptionList
        compressed
        type="column"
        data-test-subj="collectorDetailHealth"
        listItems={[
          {
            title: i18n.translate('xpack.fleet.otelUi.collectorDetail.health.statusLabel', {
              defaultMessage: 'Status',
            }),
            description: (
              <EuiBadge color={HEALTH_STATUS_COLORS[overallStatus]}>
                {getHealthStatusLabel(overallStatus)}
              </EuiBadge>
            ),
          },
          {
            title: i18n.translate(
              'xpack.fleet.otelUi.collectorDetail.health.reportedStatusLabel',
              { defaultMessage: 'Reported status' }
            ),
            description: health.status || '-',
          },
          {
            title: i18n.translate('xpack.fleet.otelUi.collectorDetail.health.lastUpdatedLabel', {
              defaultMessage: 'Last updated',
            }),
            description: health.status_time_unix_nano ? (
              <FormattedTimestamp nanos={health.status_time_unix_nano} />
            ) : (
              '-'
            ),
          },
          ...(health.last_error
            ? [
                {
                  title: i18n.translate(
                    'xpack.fleet.otelUi.collectorDetail.health.lastErrorLabel',
                    { defaultMessage: 'Last error' }
                  ),
                  description: (
                    <EuiTextColor color="danger">{health.last_error}</EuiTextColor>
                  ),
                },
              ]
            : []),
        ]}
      />
      {componentEntries.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiText size="xs">
            <strong>
              {i18n.translate('xpack.fleet.otelUi.collectorDetail.health.componentsLabel', {
                defaultMessage: 'Components',
              })}
            </strong>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGroup direction="column" gutterSize="xs">
            {componentEntries.map(([name, componentHealth]) => {
              const status = getComponentHealthStatus(componentHealth);
              return (
                <EuiFlexItem key={name} grow={false}>
                  <EuiFlexGroup
                    gutterSize="s"
                    alignItems="flexStart"
                    responsive={false}
                    direction="column"
                  >
                    <EuiFlexItem grow={false}>
                      <EuiHealth color={HEALTH_STATUS_COLORS[status]}>
                        <EuiText size="xs">{name}</EuiText>
                      </EuiHealth>
                    </EuiFlexItem>
                    {componentHealth.last_error && (
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs">
                          <EuiTextColor color="danger">
                            &nbsp;&nbsp;&nbsp;&nbsp;{componentHealth.last_error}
                          </EuiTextColor>
                        </EuiText>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
