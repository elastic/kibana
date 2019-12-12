/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { Network } from './network';
import { SourceDestinationWithArrows } from './source_destination_with_arrows';
import { SourceDestinationProps } from './types';

const EuiFlexItemMarginTop = styled(EuiFlexItem)`
  margin-top: 3px;
`;

EuiFlexItemMarginTop.displayName = 'EuiFlexItemMarginTop';

/**
 * Renders a visualization of network traffic between a source and a destination
 * This component is used by the Netflow row renderer
 */
export const SourceDestination = React.memo<SourceDestinationProps>(
  ({
    contextId,
    destinationBytes,
    destinationGeoContinentName,
    destinationGeoCountryName,
    destinationGeoCountryIsoCode,
    destinationGeoRegionName,
    destinationGeoCityName,
    destinationIp,
    destinationPackets,
    destinationPort,
    eventId,
    networkBytes,
    networkCommunityId,
    networkDirection,
    networkPackets,
    networkProtocol,
    sourceBytes,
    sourceGeoContinentName,
    sourceGeoCountryName,
    sourceGeoCountryIsoCode,
    sourceGeoRegionName,
    sourceGeoCityName,
    sourceIp,
    sourcePackets,
    sourcePort,
    transport,
  }) => (
    <EuiFlexGroup alignItems="center" direction="column" justifyContent="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <Network
          bytes={networkBytes}
          packets={networkPackets}
          communityId={networkCommunityId}
          contextId={contextId}
          eventId={eventId}
          direction={networkDirection}
          protocol={networkProtocol}
          transport={transport}
        />
      </EuiFlexItem>

      <EuiFlexItemMarginTop grow={false}>
        <SourceDestinationWithArrows
          contextId={contextId}
          destinationBytes={destinationBytes}
          destinationGeoContinentName={destinationGeoContinentName}
          destinationGeoCountryName={destinationGeoCountryName}
          destinationGeoCountryIsoCode={destinationGeoCountryIsoCode}
          destinationGeoRegionName={destinationGeoRegionName}
          destinationGeoCityName={destinationGeoCityName}
          destinationIp={destinationIp}
          destinationPackets={destinationPackets}
          destinationPort={destinationPort}
          eventId={eventId}
          sourceBytes={sourceBytes}
          sourceGeoContinentName={sourceGeoContinentName}
          sourceGeoCountryName={sourceGeoCountryName}
          sourceGeoCountryIsoCode={sourceGeoCountryIsoCode}
          sourceGeoRegionName={sourceGeoRegionName}
          sourceGeoCityName={sourceGeoCityName}
          sourceIp={sourceIp}
          sourcePackets={sourcePackets}
          sourcePort={sourcePort}
        />
      </EuiFlexItemMarginTop>
    </EuiFlexGroup>
  )
);

SourceDestination.displayName = 'SourceDestination';
