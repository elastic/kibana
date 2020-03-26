/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiLink,
  EuiTitle,
  EuiTextColor,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { MonitorSSLCertificate } from './monitor_ssl_certificate';
import * as labels from './translations';
import { StatusByLocations } from './status_by_location';
import { Ping } from '../../../../../common/graphql/types';
import { MonitorLocations } from '../../../../../common/runtime_types';

interface MonitorStatusBarProps {
  monitorId: string;
  monitorStatus: Ping;
  monitorLocations: MonitorLocations;
}

export const MonitorStatusBarComponent: React.FC<MonitorStatusBarProps> = ({
  monitorId,
  monitorStatus,
  monitorLocations,
}) => {
  const full = monitorStatus?.url?.full ?? '';

  return (
    <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
      <EuiFlexItem grow={false}>
        <StatusByLocations locations={monitorLocations?.locations ?? []} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText>
          <EuiLink aria-label={labels.monitorUrlLinkAriaLabel} href={full} target="_blank">
            {full}
          </EuiLink>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <EuiTextColor color="subdued">
            <h1 data-test-subj="monitor-page-title">{monitorId}</h1>
          </EuiTextColor>
        </EuiTitle>
      </EuiFlexItem>
      <EuiSpacer />
      <EuiFlexItem grow={false}>
        <MonitorSSLCertificate tls={monitorStatus?.tls} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
