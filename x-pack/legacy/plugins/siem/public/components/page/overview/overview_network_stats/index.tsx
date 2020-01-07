/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiLoadingSpinner,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { FormattedMessage } from '@kbn/i18n/react';
import { has } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { OverviewNetworkData } from '../../../../graphql/types';
import { getEmptyTagValue } from '../../../empty_value';

interface OverviewNetworkProps {
  data: OverviewNetworkData;
  loading: boolean;
}

const overviewNetworkStats = (data: OverviewNetworkData) => [
  {
    description:
      has('auditbeatSocket', data) && data.auditbeatSocket !== null
        ? numeral(data.auditbeatSocket).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        defaultMessage="Auditbeat Socket"
        id="xpack.siem.overview.auditBeatSocketTitle"
      />
    ),
    id: 'auditbeatSocket',
  },
  {
    description:
      has('filebeatCisco', data) && data.filebeatCisco !== null
        ? numeral(data.filebeatCisco).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        defaultMessage="Filebeat Cisco"
        id="xpack.siem.overview.filebeatCiscoTitle"
      />
    ),
    id: 'filebeatCisco',
  },
  {
    description:
      has('filebeatNetflow', data) && data.filebeatNetflow !== null
        ? numeral(data.filebeatNetflow).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        defaultMessage="Filebeat Netflow"
        id="xpack.siem.overview.filebeatNetflowTitle"
      />
    ),
    id: 'filebeatNetflow',
  },
  {
    description:
      has('filebeatPanw', data) && data.filebeatPanw !== null
        ? numeral(data.filebeatPanw).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        defaultMessage="Filebeat Palo Alto Networks"
        id="xpack.siem.overview.filebeatPanwTitle"
      />
    ),
    id: 'filebeatPanw',
  },
  {
    description:
      has('filebeatSuricata', data) && data.filebeatSuricata !== null
        ? numeral(data.filebeatSuricata).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        defaultMessage="Filebeat Suricata"
        id="xpack.siem.overview.fileBeatSuricataTitle"
      />
    ),
    id: 'filebeatSuricata',
  },
  {
    description:
      has('filebeatZeek', data) && data.filebeatZeek !== null
        ? numeral(data.filebeatZeek).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage defaultMessage="Filebeat Zeek" id="xpack.siem.overview.fileBeatZeekTitle" />
    ),
    id: 'filebeatZeek',
  },
  {
    description:
      has('packetbeatDNS', data) && data.packetbeatDNS !== null
        ? numeral(data.packetbeatDNS).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        defaultMessage="Packetbeat DNS"
        id="xpack.siem.overview.packetBeatDnsTitle"
      />
    ),
    id: 'packetbeatDNS',
  },
  {
    description:
      has('packetbeatFlow', data) && data.packetbeatFlow !== null
        ? numeral(data.packetbeatFlow).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        defaultMessage="Packetbeat Flow"
        id="xpack.siem.overview.packetBeatFlowTitle"
      />
    ),
    id: 'packetbeatFlow',
  },
  {
    description:
      has('packetbeatTLS', data) && data.packetbeatTLS !== null
        ? numeral(data.packetbeatTLS).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        defaultMessage="Packetbeat TLS"
        id="xpack.siem.overview.packetbeatTLSTitle"
      />
    ),
    id: 'packetbeatTLS',
  },
];

export const DescriptionListDescription = styled(EuiDescriptionListDescription)`
  text-align: right;
`;

DescriptionListDescription.displayName = 'DescriptionListDescription';

const StatValue = React.memo<{ isLoading: boolean; value: React.ReactNode | null | undefined }>(
  ({ isLoading, value }) => (
    <>{isLoading ? <EuiLoadingSpinner size="m" /> : value != null ? value : getEmptyTagValue()}</>
  )
);

StatValue.displayName = 'StatValue';

export const OverviewNetworkStats = React.memo<OverviewNetworkProps>(({ data, loading }) => (
  <EuiDescriptionList type="column">
    {overviewNetworkStats(data).map((item, index) => (
      <React.Fragment key={index}>
        <EuiDescriptionListTitle>{item.title}</EuiDescriptionListTitle>
        <DescriptionListDescription data-test-subj={`network-stat-${item.id}`}>
          <StatValue isLoading={loading} value={item.description} />
        </DescriptionListDescription>
      </React.Fragment>
    ))}
  </EuiDescriptionList>
));

OverviewNetworkStats.displayName = 'OverviewNetworkStats';
