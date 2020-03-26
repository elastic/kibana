/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiLink, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { MonitorSummary } from '../../../../../common/graphql/types';
import { MostRecentError } from './most_recent_error';
import { MonitorStatusList } from './monitor_status_list';
import { MonitorDetails } from '../../../../../common/runtime_types';
import { MonitorListActionsPopover } from '../../../connected';

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
}

/**
 * The elements shown when the user expands the monitor list rows.
 */

export function MonitorListDrawerComponent({ summary, monitorDetails }: MonitorListDrawerProps) {
  const monitorUrl = summary?.state?.url?.full || '';

  return summary && summary.state.checks ? (
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
  ) : null;
}
