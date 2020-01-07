/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { Fingerprints } from './fingerprints';
import { NetflowColumns } from './netflow_columns';
import { NetflowProps } from './types';

/**
 * Renders a visual representation of network traffic between hosts,
 * typically for use in a row renderer. In addition to rendering Netflow event
 * data (i.e. `event.action: netflow_flow`), this row renderer is also useful
 * when, for example:
 * - `event.action` is `network_flow` or `socket_open`
 * - `event.category` is `network_traffic`
 * - rendering data from `Zeek` and `Suricata`
 */
export const Netflow = React.memo<NetflowProps>(
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
    eventDuration,
    eventId,
    eventEnd,
    eventStart,
    networkBytes,
    networkCommunityId,
    networkDirection,
    networkPackets,
    networkProtocol,
    processName,
    sourceBytes,
    sourceGeoContinentName,
    sourceGeoCountryName,
    sourceGeoCountryIsoCode,
    sourceGeoRegionName,
    sourceGeoCityName,
    sourcePackets,
    sourceIp,
    sourcePort,
    tlsClientCertificateFingerprintSha1,
    tlsFingerprintsJa3Hash,
    tlsServerCertificateFingerprintSha1,
    transport,
    userName,
  }) => (
    <EuiFlexGroup
      alignItems="center"
      data-test-subj="netflow-rows"
      direction="column"
      gutterSize="none"
      justifyContent="center"
      wrap={true}
    >
      <EuiFlexItem grow={false}>
        <NetflowColumns
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
          eventDuration={eventDuration}
          eventEnd={eventEnd}
          eventId={eventId}
          eventStart={eventStart}
          networkBytes={networkBytes}
          networkCommunityId={networkCommunityId}
          networkDirection={networkDirection}
          networkPackets={networkPackets}
          networkProtocol={networkProtocol}
          processName={processName}
          sourceBytes={sourceBytes}
          sourceGeoCityName={sourceGeoCityName}
          sourceGeoContinentName={sourceGeoContinentName}
          sourceGeoCountryIsoCode={sourceGeoCountryIsoCode}
          sourceGeoCountryName={sourceGeoCountryName}
          sourceGeoRegionName={sourceGeoRegionName}
          sourceIp={sourceIp}
          sourcePackets={sourcePackets}
          sourcePort={sourcePort}
          transport={transport}
          userName={userName}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Fingerprints
          contextId={contextId}
          eventId={eventId}
          tlsClientCertificateFingerprintSha1={tlsClientCertificateFingerprintSha1}
          tlsFingerprintsJa3Hash={tlsFingerprintsJa3Hash}
          tlsServerCertificateFingerprintSha1={tlsServerCertificateFingerprintSha1}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  )
);

Netflow.displayName = 'Netflow';
