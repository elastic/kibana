/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertStatus, ALERT_FLAPPING, ALERT_STATUS } from '@kbn/rule-data-utils';
import React, { memo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { AlertLifecycleStatusBadge } from '../../../components/alert_lifecycle_status_badge';
import { DefaultCell } from './default_cell';
import { useAlertMutedState } from '../hooks/alert_mute/use_alert_muted_state';
import type { CellComponent } from '../types';

const mutedBadgeStyle = css`
  padding-inline: ${euiThemeVars.euiSizeXS};
`;

export const AlertLifecycleStatusCell: CellComponent = memo((props) => {
  const { alert, showAlertStatusWithFlapping } = props;
  const { isMuted } = useAlertMutedState(alert);

  if (!showAlertStatusWithFlapping) {
    return null;
  }

  const alertStatus = (alert && alert[ALERT_STATUS]) ?? [];

  if (Array.isArray(alertStatus) && alertStatus.length) {
    const flapping = (alert && alert[ALERT_FLAPPING]) ?? [];

    return (
      <EuiFlexGroup gutterSize="s">
        <AlertLifecycleStatusBadge
          alertStatus={alertStatus.join() as AlertStatus}
          flapping={flapping[0]}
        />
        {isMuted && (
          <EuiToolTip
            content={i18n.translate('xpack.triggersActionsUI.sections.alertsTable.alertMuted', {
              defaultMessage: 'Alert muted',
            })}
          >
            <EuiBadge iconType="bellSlash" css={mutedBadgeStyle} />
          </EuiToolTip>
        )}
      </EuiFlexGroup>
    );
  }

  return <DefaultCell {...props} />;
});
