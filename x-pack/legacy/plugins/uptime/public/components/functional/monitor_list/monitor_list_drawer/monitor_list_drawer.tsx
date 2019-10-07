/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect } from 'react';
import {
  EuiHealth,
  EuiLink,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiIcon,
} from '@elastic/eui';
import { get } from 'lodash';
import styled from 'styled-components';
import { connect } from 'react-redux';
import { MonitorSummary, CheckMonitor } from '../../../../../common/graphql/types';
import { UptimeSettingsContext } from '../../../../contexts';
import { AppState } from '../../../../state';
import { MonitorDetailsRequest } from '../../../../state/actions/monitor';
import { MostRecentError } from './most_recent_error';
import { getMonitorDetails } from '../../../../state/selectors';
import { fetchMonitorDetailsAction } from '../../../../state/effects/monitor';

const ContainerDiv = styled.div`
  padding: 10px;
  width: 100%;
`;

interface MonitorListDrawerProps {
  summary: MonitorSummary;
  loadMonitorDetails: typeof fetchMonitorDetailsAction;
}

/**
 * The elements shown when the user expands the monitor list rows.
 */

const WrapperComponent = props => {
  return <MonitorListDrawerComponent {...props} />;
};
export function MonitorListDrawerComponent({ summary, loadMonitorDetails }) {
  const monitorUrl: string | undefined = get(summary.state.url, 'full', undefined);

  return (
    <ContainerDiv>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiLink href={monitorUrl}>
            {monitorUrl}
            <EuiIcon size="s" type="popout" color="subbdued" />
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s">Actions</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </ContainerDiv>
  );
}

const mapStateToProps = (state: AppState, { summary }: any) => ({});

const mapDispatchToProps = (dispatch: any) => ({
  loadMonitorDetails: (data: MonitorDetailsRequest) => dispatch(fetchMonitorDetailsAction(data)),
});

export const MonitorListDrawer = connect(
  mapStateToProps,
  mapDispatchToProps
)(WrapperComponent);
