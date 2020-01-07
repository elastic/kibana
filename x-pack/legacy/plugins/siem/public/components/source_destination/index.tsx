/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
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
    <EuiFlexGroup alignItems="center" direction="column" gutterSize="none" justifyContent="center">
      <EuiFlexItem grow={false}>
        <Network
          bytes={networkBytes}
          communityId={networkCommunityId}
          contextId={contextId}
          direction={networkDirection}
          eventId={eventId}
          packets={networkPackets}
          protocol={networkProtocol}
          transport={transport}
        />
      </EuiFlexItem>

      <EuiFlexItemMarginTop grow={false}>
        <SourceDestinationWithArrows
          contextId={contextId}
          destinationBytes={destinationBytes}
          destinationGeoCityName={destinationGeoCityName}
          destinationGeoContinentName={destinationGeoContinentName}
          destinationGeoCountryIsoCode={destinationGeoCountryIsoCode}
          destinationGeoCountryName={destinationGeoCountryName}
          destinationGeoRegionName={destinationGeoRegionName}
          destinationIp={destinationIp}
          destinationPackets={destinationPackets}
          destinationPort={destinationPort}
          eventId={eventId}
          sourceBytes={sourceBytes}
          sourceGeoCityName={sourceGeoCityName}
          sourceGeoContinentName={sourceGeoContinentName}
          sourceGeoCountryIsoCode={sourceGeoCountryIsoCode}
          sourceGeoCountryName={sourceGeoCountryName}
          sourceGeoRegionName={sourceGeoRegionName}
          sourceIp={sourceIp}
          sourcePackets={sourcePackets}
          sourcePort={sourcePort}
        />
      </EuiFlexItemMarginTop>
    </EuiFlexGroup>
  )
);

SourceDestination.displayName = 'SourceDestination';
