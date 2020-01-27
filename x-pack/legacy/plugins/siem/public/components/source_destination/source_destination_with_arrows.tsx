/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as React from 'react';

import { SourceDestinationArrows } from './source_destination_arrows';
import { SourceDestinationIp } from './source_destination_ip';
import { SourceDestinationWithArrowsProps } from './types';

/**
 * Visualizes the communication between a source and a destination by
 * providing an interactive (draggable, hyperlinked) visualization,
 * which contains both the source and destination. (See
 * `SourceDestinationIp` ) for details on how the source and destination
 * are visually represented.
 */
export const SourceDestinationWithArrows = React.memo<SourceDestinationWithArrowsProps>(
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
    sourceBytes,
    sourceGeoContinentName,
    sourceGeoCountryName,
    sourceGeoCountryIsoCode,
    sourceGeoRegionName,
    sourceGeoCityName,
    sourcePackets,
    sourceIp,
    sourcePort,
  }) => (
    <EuiFlexGroup justifyContent="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <SourceDestinationIp
          contextId={contextId}
          destinationGeoContinentName={destinationGeoContinentName}
          destinationGeoCountryName={destinationGeoCountryName}
          destinationGeoCountryIsoCode={destinationGeoCountryIsoCode}
          destinationGeoRegionName={destinationGeoRegionName}
          destinationGeoCityName={destinationGeoCityName}
          destinationIp={destinationIp}
          destinationPort={destinationPort}
          eventId={eventId}
          sourceGeoContinentName={sourceGeoContinentName}
          sourceGeoCountryName={sourceGeoCountryName}
          sourceGeoCountryIsoCode={sourceGeoCountryIsoCode}
          sourceGeoRegionName={sourceGeoRegionName}
          sourceGeoCityName={sourceGeoCityName}
          sourceIp={sourceIp}
          sourcePort={sourcePort}
          type="source"
        />
      </EuiFlexItem>

      <SourceDestinationArrows
        contextId={contextId}
        destinationBytes={destinationBytes}
        destinationPackets={destinationPackets}
        eventId={eventId}
        sourceBytes={sourceBytes}
        sourcePackets={sourcePackets}
      />

      <EuiFlexItem grow={false}>
        <SourceDestinationIp
          contextId={contextId}
          destinationGeoContinentName={destinationGeoContinentName}
          destinationGeoCountryName={destinationGeoCountryName}
          destinationGeoCountryIsoCode={destinationGeoCountryIsoCode}
          destinationGeoRegionName={destinationGeoRegionName}
          destinationGeoCityName={destinationGeoCityName}
          destinationIp={destinationIp}
          destinationPort={destinationPort}
          eventId={eventId}
          sourceGeoContinentName={sourceGeoContinentName}
          sourceGeoCountryName={sourceGeoCountryName}
          sourceGeoCountryIsoCode={sourceGeoCountryIsoCode}
          sourceGeoRegionName={sourceGeoRegionName}
          sourceGeoCityName={sourceGeoCityName}
          sourceIp={sourceIp}
          sourcePort={sourcePort}
          type="destination"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  )
);

SourceDestinationWithArrows.displayName = 'SourceDestinationWithArrows';
