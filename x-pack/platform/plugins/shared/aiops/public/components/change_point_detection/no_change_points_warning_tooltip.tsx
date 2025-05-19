/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiIcon } from '@elastic/eui';

interface NoChangePointsWarningTooltipProps {
  reason?: string;
}

export const NoChangePointsWarningTooltip: React.FC<NoChangePointsWarningTooltipProps> = ({
  reason,
}) => {
  return (
    <EuiToolTip
      position="top"
      content={
        reason ??
        i18n.translate('xpack.aiops.changePointDetection.noChangePointsWarning', {
          defaultMessage: 'No change points detected - showing sample metric data',
        })
      }
    >
      <EuiIcon
        tabIndex={0}
        color={'warning'}
        type="warning"
        title={i18n.translate('xpack.aiops.changePointDetection.notResultsWarning', {
          defaultMessage: 'No change point agg results warning',
        })}
      />
    </EuiToolTip>
  );
};
