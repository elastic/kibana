/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { EuiLink, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { get } from 'lodash';
import styled from 'styled-components';
import { connect } from 'react-redux';
import { MonitorSummary } from '../../../../../common/graphql/types';
import { AppState } from '../../../../state';
import { fetchMonitorDetails } from '../../../../state/actions/monitor';
import { MostRecentError } from './most_recent_error';
import { getMonitorDetails, getFilters } from '../../../../state/selectors';
import { MonitorStatusList } from './monitor_status_list';
import { MonitorDetails } from '../../../../../common/runtime_types';
import { useUrlParams } from '../../../../hooks';
import { MonitorDetailsActionPayload } from '../../../../state/actions/types';
import { MonitorListActionsPopover } from '../monitor_list_actions_popover';

const ContainerDiv = styled.div`
  padding: 10px;
  width: 100%;
`;

interface MonitorListDrawerProps {
  /**
   * Monitor Summary
   */
  summary: MonitorSummary;

  /**
   * Monitor details to be fetched from rest api using monitorId
   */
  monitorDetails: MonitorDetails;

  /**
   * Redux action to trigger , loading monitor details
   */
  loadMonitorDetails: typeof fetchMonitorDetails;

  /**
   * Filters from filter bar
   */
  filters: Map<string, string[]>;
}

/**
 * The elements shown when the user expands the monitor list rows.
 */

export function MonitorListDrawerComponent({
  summary,
  loadMonitorDetails,
  monitorDetails,
  filters,
}: MonitorListDrawerProps) {
  if (!summary || !summary.state.checks) {
    return null;
  }
  const { monitor_id: monitorId } = summary;
  const [getUrlParams] = useUrlParams();
  const { dateRangeStart: dateStart, dateRangeEnd: dateEnd } = getUrlParams();

  useEffect(() => {
    const location = filters?.get('observer.geo.name') ?? [];
    loadMonitorDetails({
      dateStart,
      dateEnd,
      monitorId,
      location: location.join(),
    });
  }, [dateStart, dateEnd, filters]);

  const monitorUrl: string | undefined = get(summary.state.url, 'full', undefined);

  return (
    <ContainerDiv>
      <EuiFlexGroup>
        <EuiFlexItem grow={true}>
          <EuiText>
            <EuiLink href={monitorUrl} target="_blank">
              {monitorUrl}
              <EuiIcon size="s" type="popout" color="subbdued" />
            </EuiLink>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <MonitorListActionsPopover summary={summary} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <MonitorStatusList checks={summary.state.checks} />
      {monitorDetails && monitorDetails.error && (
        <MostRecentError
          error={monitorDetails.error}
          monitorId={summary.monitor_id}
          timestamp={monitorDetails.timestamp}
        />
      )}
    </ContainerDiv>
  );
}

const mapStateToProps = (state: AppState, { summary }: any) => ({
  monitorDetails: getMonitorDetails(state, summary),
  filters: getFilters(state),
});

const mapDispatchToProps = (dispatch: any) => ({
  loadMonitorDetails: (actionPayload: MonitorDetailsActionPayload) =>
    dispatch(fetchMonitorDetails(actionPayload)),
});

export const MonitorListDrawer = connect(
  mapStateToProps,
  mapDispatchToProps
)(MonitorListDrawerComponent);
