/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiBadge } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { statusCodes } from './statusCodes';

const {
  euiColorDarkShade,
  euiColorSecondary,
  euiColorWarning,
  euiColorDanger
} = theme;

function getStatusColor(status: number) {
  const colors: { [key: string]: string } = {
    1: euiColorDarkShade,
    2: euiColorSecondary,
    3: euiColorDarkShade,
    4: euiColorWarning,
    5: euiColorDanger
  };

  return colors[status.toString().substr(0, 1)] || 'default';
}

interface HttpStatusBadgeProps {
  status: number;
}
export function HttpStatusBadge({ status }: HttpStatusBadgeProps) {
  const label = i18n.translate('xpack.apm.transactionDetails.statusCode', {
    defaultMessage: 'Status code'
  });

  return (
    <EuiToolTip content={label}>
      <EuiBadge color={getStatusColor(status)}>
        {status} {statusCodes[status.toString()]}
      </EuiBadge>
    </EuiToolTip>
  );
}
