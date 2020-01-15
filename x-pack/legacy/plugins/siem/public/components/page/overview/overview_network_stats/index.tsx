/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAccordion, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { OverviewNetworkData } from '../../../../graphql/types';
import { FormattedStat, StatGroup } from '../types';
import { StatValue } from '../stat_value';

interface OverviewNetworkProps {
  data: OverviewNetworkData;
  loading: boolean;
}

export const getOverviewNetworkStats = (data: OverviewNetworkData): FormattedStat[] => [
  {
    count: data.auditbeatSocket ?? 0,
    title: (
      <FormattedMessage id="xpack.siem.overview.auditBeatSocketTitle" defaultMessage="Socket" />
    ),
    id: 'auditbeatSocket',
  },
  {
    count: data.filebeatCisco ?? 0,
    title: <FormattedMessage id="xpack.siem.overview.filebeatCiscoTitle" defaultMessage="Cisco" />,
    id: 'filebeatCisco',
  },
  {
    count: data.filebeatNetflow ?? 0,
    title: (
      <FormattedMessage id="xpack.siem.overview.filebeatNetflowTitle" defaultMessage="Netflow" />
    ),
    id: 'filebeatNetflow',
  },
  {
    count: data.filebeatPanw ?? 0,
    title: (
      <FormattedMessage
        id="xpack.siem.overview.filebeatPanwTitle"
        defaultMessage="Palo Alto Networks"
      />
    ),
    id: 'filebeatPanw',
  },
  {
    count: data.filebeatSuricata ?? 0,
    title: (
      <FormattedMessage id="xpack.siem.overview.fileBeatSuricataTitle" defaultMessage="Suricata" />
    ),
    id: 'filebeatSuricata',
  },
  {
    count: data.filebeatZeek ?? 0,
    title: <FormattedMessage id="xpack.siem.overview.fileBeatZeekTitle" defaultMessage="Zeek" />,
    id: 'filebeatZeek',
  },
  {
    count: data.packetbeatDNS ?? 0,
    title: <FormattedMessage id="xpack.siem.overview.packetBeatDnsTitle" defaultMessage="DNS" />,
    id: 'packetbeatDNS',
  },
  {
    count: data.packetbeatFlow ?? 0,
    title: <FormattedMessage id="xpack.siem.overview.packetBeatFlowTitle" defaultMessage="Flow" />,
    id: 'packetbeatFlow',
  },
  {
    count: data.packetbeatTLS ?? 0,
    title: <FormattedMessage id="xpack.siem.overview.packetbeatTLSTitle" defaultMessage="TLS" />,
    id: 'packetbeatTLS',
  },
];

const networkStatGroups: StatGroup[] = [
  {
    groupId: 'auditbeat',
    name: (
      <FormattedMessage
        id="xpack.siem.overview.networkStatGroupAuditbeat"
        defaultMessage="Auditbeat"
      />
    ),
    statIds: ['auditbeatSocket'],
  },
  {
    groupId: 'filebeat',
    name: (
      <FormattedMessage
        id="xpack.siem.overview.networkStatGroupFilebeat"
        defaultMessage="Filebeat"
      />
    ),
    statIds: [
      'filebeatCisco',
      'filebeatNetflow',
      'filebeatPanw',
      'filebeatSuricata',
      'filebeatZeek',
    ],
  },
  {
    groupId: 'packetbeat',
    name: (
      <FormattedMessage
        id="xpack.siem.overview.networkStatGroupPacketbeat"
        defaultMessage="Packetbeat"
      />
    ),
    statIds: ['packetbeatDNS', 'packetbeatFlow', 'packetbeatTLS'],
  },
];

const NetworkStatsContainer = styled.div`
  .accordion-button {
    width: 100%;
  }
`;

const Title = styled.div`
  margin-left: 24px;
`;

export const OverviewNetworkStats = React.memo<OverviewNetworkProps>(({ data, loading }) => {
  const allNetworkStats = getOverviewNetworkStats(data);
  const allNetworkStatsCount = allNetworkStats.reduce((total, stat) => total + stat.count, 0);

  return (
    <NetworkStatsContainer data-test-subj="overview-network-stats">
      {networkStatGroups.map((statGroup, i) => {
        const statsForGroup = allNetworkStats.filter(s => statGroup.statIds.includes(s.id));
        const statsForGroupCount = statsForGroup.reduce((total, stat) => total + stat.count, 0);

        const accordionButton = useMemo(
          () => (
            <EuiFlexGroup
              data-test-subj={`network-stat-group-${statGroup.groupId}`}
              justifyContent="spaceBetween"
            >
              <EuiFlexItem grow={false}>
                <EuiText>{statGroup.name}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <StatValue
                  count={statsForGroupCount}
                  isGroupStat={true}
                  isLoading={loading}
                  max={allNetworkStatsCount}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
          [statGroup, statsForGroupCount, loading, allNetworkStatsCount]
        );

        return (
          <React.Fragment key={statGroup.groupId}>
            <EuiAccordion
              id={`network-stat-accordion-group${statGroup.groupId}`}
              buttonContent={accordionButton}
              buttonContentClassName="accordion-button"
            >
              {statsForGroup.map(stat => (
                <EuiFlexGroup key={stat.id} justifyContent="spaceBetween">
                  <EuiFlexItem grow={false}>
                    <EuiText color="subdued" size="s">
                      <Title>{stat.title}</Title>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem data-test-subj={`network-stat-${stat.id}`} grow={false}>
                    <StatValue
                      count={stat.count}
                      isGroupStat={false}
                      isLoading={loading}
                      max={statsForGroupCount}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              ))}
            </EuiAccordion>
            {i !== networkStatGroups.length - 1 && <EuiHorizontalRule margin="xs" />}
          </React.Fragment>
        );
      })}
    </NetworkStatsContainer>
  );
});

OverviewNetworkStats.displayName = 'OverviewNetworkStats';
