/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-plugin/server/resources/datastreams/alert_events';

export interface AlertingEpisodeStatusBadgeProps {
  status: AlertEpisodeStatus;
}

/**
 * Renders a badge indicating the status of an alerting episode.
 */
export const AlertingEpisodeStatusBadge = ({ status }: AlertingEpisodeStatusBadgeProps) => {
  if (status === 'inactive') {
    return (
      <EuiBadge color="success" iconType="checkCircleFill">
        {i18n.translate('xpack.alertingV2EpisodesUi.inactiveStatusBadgeLabel', {
          defaultMessage: 'Inactive',
        })}
      </EuiBadge>
    );
  }
  if (status === 'pending') {
    return (
      <EuiBadge color="warning" iconType="contrastFill">
        {i18n.translate('xpack.alertingV2EpisodesUi.pendingStatusBadgeLabel', {
          defaultMessage: 'Pending',
        })}
      </EuiBadge>
    );
  }
  if (status === 'active') {
    return (
      <EuiBadge color="danger" iconType="warningFill">
        {i18n.translate('xpack.alertingV2EpisodesUi.activeStatusBadgeLabel', {
          defaultMessage: 'Active',
        })}
      </EuiBadge>
    );
  }
  if (status === 'recovering') {
    return (
      <EuiBadge color="primary" iconType="undo">
        {i18n.translate('xpack.alertingV2EpisodesUi.recoveringStatusBadgeLabel', {
          defaultMessage: 'Recovering',
        })}
      </EuiBadge>
    );
  }
  return (
    <EuiBadge color="hollow" iconType="question">
      {i18n.translate('xpack.alertingV2EpisodesUi.unknownStatusBadgeLabel', {
        defaultMessage: 'Unknown',
      })}
    </EuiBadge>
  );
};
