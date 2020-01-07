/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import React from 'react';

import { Ecs } from '../../../../graphql/types';
import { asArrayIfExists } from '../../../../lib/helpers';
import {
  TLS_CLIENT_CERTIFICATE_FINGERPRINT_SHA1_FIELD_NAME,
  TLS_SERVER_CERTIFICATE_FINGERPRINT_SHA1_FIELD_NAME,
} from '../../../certificate_fingerprint';
import { EVENT_DURATION_FIELD_NAME } from '../../../duration';
import { ID_FIELD_NAME } from '../../../event_details/event_id';
import { DESTINATION_IP_FIELD_NAME, SOURCE_IP_FIELD_NAME } from '../../../ip';
import { JA3_HASH_FIELD_NAME } from '../../../ja3_fingerprint';
import { Netflow } from '../../../netflow';
import {
  EVENT_END_FIELD_NAME,
  EVENT_START_FIELD_NAME,
} from '../../../netflow/netflow_columns/duration_event_start_end';
import { DESTINATION_PORT_FIELD_NAME, SOURCE_PORT_FIELD_NAME } from '../../../port';
import {
  DESTINATION_GEO_CITY_NAME_FIELD_NAME,
  DESTINATION_GEO_CONTINENT_NAME_FIELD_NAME,
  DESTINATION_GEO_COUNTRY_ISO_CODE_FIELD_NAME,
  DESTINATION_GEO_COUNTRY_NAME_FIELD_NAME,
  DESTINATION_GEO_REGION_NAME_FIELD_NAME,
  SOURCE_GEO_CITY_NAME_FIELD_NAME,
  SOURCE_GEO_CONTINENT_NAME_FIELD_NAME,
  SOURCE_GEO_COUNTRY_ISO_CODE_FIELD_NAME,
  SOURCE_GEO_COUNTRY_NAME_FIELD_NAME,
  SOURCE_GEO_REGION_NAME_FIELD_NAME,
} from '../../../source_destination/geo_fields';
import {
  DESTINATION_BYTES_FIELD_NAME,
  DESTINATION_PACKETS_FIELD_NAME,
  SOURCE_BYTES_FIELD_NAME,
  SOURCE_PACKETS_FIELD_NAME,
} from '../../../source_destination/source_destination_arrows';
import {
  NETWORK_BYTES_FIELD_NAME,
  NETWORK_COMMUNITY_ID_FIELD_NAME,
  NETWORK_DIRECTION_FIELD_NAME,
  NETWORK_PACKETS_FIELD_NAME,
  NETWORK_PROTOCOL_FIELD_NAME,
  NETWORK_TRANSPORT_FIELD_NAME,
} from '../../../source_destination/field_names';

interface NetflowRendererProps {
  data: Ecs;
  timelineId: string;
}

export const NetflowRenderer = React.memo<NetflowRendererProps>(({ data, timelineId }) => (
  <Netflow
    contextId={`netflow-renderer-${timelineId}-${data._id}`}
    destinationBytes={asArrayIfExists(get(DESTINATION_BYTES_FIELD_NAME, data))}
    destinationGeoCityName={asArrayIfExists(get(DESTINATION_GEO_CITY_NAME_FIELD_NAME, data))}
    destinationGeoContinentName={asArrayIfExists(
      get(DESTINATION_GEO_CONTINENT_NAME_FIELD_NAME, data)
    )}
    destinationGeoCountryIsoCode={asArrayIfExists(
      get(DESTINATION_GEO_COUNTRY_ISO_CODE_FIELD_NAME, data)
    )}
    destinationGeoCountryName={asArrayIfExists(get(DESTINATION_GEO_COUNTRY_NAME_FIELD_NAME, data))}
    destinationGeoRegionName={asArrayIfExists(get(DESTINATION_GEO_REGION_NAME_FIELD_NAME, data))}
    destinationIp={asArrayIfExists(get(DESTINATION_IP_FIELD_NAME, data))}
    destinationPackets={asArrayIfExists(get(DESTINATION_PACKETS_FIELD_NAME, data))}
    destinationPort={asArrayIfExists(get(DESTINATION_PORT_FIELD_NAME, data))}
    eventDuration={asArrayIfExists(get(EVENT_DURATION_FIELD_NAME, data))}
    eventEnd={asArrayIfExists(get(EVENT_END_FIELD_NAME, data))}
    eventId={get(ID_FIELD_NAME, data)}
    eventStart={asArrayIfExists(get(EVENT_START_FIELD_NAME, data))}
    networkBytes={asArrayIfExists(get(NETWORK_BYTES_FIELD_NAME, data))}
    networkCommunityId={asArrayIfExists(get(NETWORK_COMMUNITY_ID_FIELD_NAME, data))}
    networkDirection={asArrayIfExists(get(NETWORK_DIRECTION_FIELD_NAME, data))}
    networkPackets={asArrayIfExists(get(NETWORK_PACKETS_FIELD_NAME, data))}
    networkProtocol={asArrayIfExists(get(NETWORK_PROTOCOL_FIELD_NAME, data))}
    sourceBytes={asArrayIfExists(get(SOURCE_BYTES_FIELD_NAME, data))}
    sourceGeoCityName={asArrayIfExists(get(SOURCE_GEO_CITY_NAME_FIELD_NAME, data))}
    sourceGeoContinentName={asArrayIfExists(get(SOURCE_GEO_CONTINENT_NAME_FIELD_NAME, data))}
    sourceGeoCountryIsoCode={asArrayIfExists(get(SOURCE_GEO_COUNTRY_ISO_CODE_FIELD_NAME, data))}
    sourceGeoCountryName={asArrayIfExists(get(SOURCE_GEO_COUNTRY_NAME_FIELD_NAME, data))}
    sourceGeoRegionName={asArrayIfExists(get(SOURCE_GEO_REGION_NAME_FIELD_NAME, data))}
    sourceIp={asArrayIfExists(get(SOURCE_IP_FIELD_NAME, data))}
    sourcePackets={asArrayIfExists(get(SOURCE_PACKETS_FIELD_NAME, data))}
    sourcePort={asArrayIfExists(get(SOURCE_PORT_FIELD_NAME, data))}
    tlsClientCertificateFingerprintSha1={asArrayIfExists(
      get(TLS_CLIENT_CERTIFICATE_FINGERPRINT_SHA1_FIELD_NAME, data)
    )}
    tlsFingerprintsJa3Hash={asArrayIfExists(get(JA3_HASH_FIELD_NAME, data))}
    tlsServerCertificateFingerprintSha1={asArrayIfExists(
      get(TLS_SERVER_CERTIFICATE_FINGERPRINT_SHA1_FIELD_NAME, data)
    )}
    transport={asArrayIfExists(get(NETWORK_TRANSPORT_FIELD_NAME, data))}
    userName={undefined}
  />
));

NetflowRenderer.displayName = 'NetflowRenderer';
