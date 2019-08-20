/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiPopover } from '@elastic/eui';
import React, { useState, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { MonitorSummary } from '../../../../common/graphql/types';
import { IntegrationGroup } from '../integration_group';
import { UptimeSettingsContext } from '../../../contexts';

interface MonitorListActionsPopoverProps {
  summary: MonitorSummary;
}

export const MonitorListActionsPopover = ({ summary }: MonitorListActionsPopoverProps) => {
  const popoverId = `${summary.monitor_id}_popover`;
  const [popoverIsVisible, setPopoverIsVisible] = useState<boolean>(false);
  const {
    basePath,
    dateRangeStart,
    dateRangeEnd,
    isApmAvailable,
    isInfraAvailable,
    isLogsAvailable,
  } = useContext(UptimeSettingsContext);

  const monitorUrl = get(summary, 'state.url.full', undefined);

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          aria-label={i18n.translate(
            'xpack.uptime.monitorList.observabilityIntegrationsColumn.popoverIconButton.ariaLabel',
            {
              defaultMessage: 'Opens integrations popover for monitor with url {monitorUrl}',
              description:
                'A message explaining that this button opens a popover with links to other apps for a given monitor',
              values: { monitorUrl },
            }
          )}
          color="subdued"
          iconType="boxesHorizontal"
          onClick={() => setPopoverIsVisible(true)}
        />
      }
      closePopover={() => setPopoverIsVisible(false)}
      id={popoverId}
      isOpen={popoverIsVisible}
    >
      <IntegrationGroup
        basePath={basePath}
        dateRangeStart={dateRangeStart}
        dateRangeEnd={dateRangeEnd}
        isApmAvailable={isApmAvailable}
        isInfraAvailable={isInfraAvailable}
        isLogsAvailable={isLogsAvailable}
        summary={summary}
      />
    </EuiPopover>
  );
};
