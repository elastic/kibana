/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiPopover } from '@elastic/eui';
import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { connect } from 'react-redux';
import { MonitorSummary } from '../../../../common/graphql/types';
import { IntegrationGroup } from '../integration_group';
import { UptimeSettingsContext } from '../../../contexts';
import { isIntegrationsPopupOpen } from '../../../state/selectors';
import { AppState } from '../../../state';
import { toggleIntegrationsPopover, PopoverState } from '../../../state/actions';

interface MonitorListActionsPopoverProps {
  summary: MonitorSummary;
  popoverState: PopoverState | null;
  togglePopoverIsVisible: typeof toggleIntegrationsPopover;
}

const MonitorListActionsPopoverComponent = ({
  summary,
  popoverState,
  togglePopoverIsVisible,
}: MonitorListActionsPopoverProps) => {
  const popoverId = `${summary.monitor_id}_popover`;
  const {
    basePath,
    dateRangeStart,
    dateRangeEnd,
    isApmAvailable,
    isMetricsAvailable,
    isLogsAvailable,
  } = useContext(UptimeSettingsContext);

  const monitorUrl: string | undefined = get(summary, 'state.url.full', undefined);
  const isPopoverOpen: boolean =
    !!popoverState && popoverState.open && popoverState.id === popoverId;
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
          onClick={() => togglePopoverIsVisible({ id: popoverId, open: true })}
        />
      }
      closePopover={() => togglePopoverIsVisible({ id: popoverId, open: false })}
      id={popoverId}
      isOpen={isPopoverOpen}
    >
      <IntegrationGroup
        basePath={basePath}
        dateRangeStart={dateRangeStart}
        dateRangeEnd={dateRangeEnd}
        isApmAvailable={isApmAvailable}
        isMetricsAvailable={isMetricsAvailable}
        isLogsAvailable={isLogsAvailable}
        summary={summary}
      />
    </EuiPopover>
  );
};

const mapStateToProps = (state: AppState) => ({
  popoverState: isIntegrationsPopupOpen(state),
});

const mapDispatchToProps = (dispatch: any) => ({
  togglePopoverIsVisible: (popoverState: PopoverState) => {
    return dispatch(toggleIntegrationsPopover(popoverState));
  },
});

export const MonitorListActionsPopover = connect(
  mapStateToProps,
  mapDispatchToProps
)(MonitorListActionsPopoverComponent);
