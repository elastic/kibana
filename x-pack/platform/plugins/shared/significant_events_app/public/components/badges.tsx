/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiBetaBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function QueryStreamBadge() {
  return (
    <EuiBadge iconType="code" color="accent">
      {i18n.translate('xpack.significantEventsApp.queryStreamBadgeLabel', {
        defaultMessage: 'Query',
      })}
    </EuiBadge>
  );
}

export const TechnicalPreviewBadge = () => (
  <EuiBetaBadge
    tooltipContent={i18n.translate('xpack.significantEventsApp.technicalPreviewTooltip', {
      defaultMessage: 'This feature is in technical preview. We are working on it...',
    })}
    label={i18n.translate('xpack.significantEventsApp.technicalPreviewLabel', {
      defaultMessage: 'Technical preview',
    })}
    iconType="flask"
    size="s"
    css={{ display: 'block' }}
  />
);
