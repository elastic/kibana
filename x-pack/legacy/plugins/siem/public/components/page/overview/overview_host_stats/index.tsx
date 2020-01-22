/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAccordion, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { OverviewHostData } from '../../../../graphql/types';
import { FormattedStat, StatGroup } from '../types';
import { StatValue } from '../stat_value';

interface OverviewHostProps {
  data: OverviewHostData;
  loading: boolean;
}

export const getOverviewHostStats = (data: OverviewHostData): FormattedStat[] => [
  {
    count: data.auditbeatAuditd ?? 0,
    title: <FormattedMessage id="xpack.siem.overview.auditBeatAuditTitle" defaultMessage="Audit" />,
    id: 'auditbeatAuditd',
  },
  {
    count: data.auditbeatFIM ?? 0,
    title: (
      <FormattedMessage
        id="xpack.siem.overview.auditBeatFimTitle"
        defaultMessage="File Integrity Module"
      />
    ),
    id: 'auditbeatFIM',
  },
  {
    count: data.auditbeatLogin ?? 0,
    title: <FormattedMessage id="xpack.siem.overview.auditBeatLoginTitle" defaultMessage="Login" />,
    id: 'auditbeatLogin',
  },
  {
    count: data.auditbeatPackage ?? 0,
    title: (
      <FormattedMessage id="xpack.siem.overview.auditBeatPackageTitle" defaultMessage="Package" />
    ),
    id: 'auditbeatPackage',
  },
  {
    count: data.auditbeatProcess ?? 0,
    title: (
      <FormattedMessage id="xpack.siem.overview.auditBeatProcessTitle" defaultMessage="Process" />
    ),
    id: 'auditbeatProcess',
  },
  {
    count: data.auditbeatUser ?? 0,
    title: <FormattedMessage id="xpack.siem.overview.auditBeatUserTitle" defaultMessage="User" />,
    id: 'auditbeatUser',
  },
  {
    count: data.endgameDns ?? 0,
    title: <FormattedMessage id="xpack.siem.overview.endgameDnsTitle" defaultMessage="DNS" />,
    id: 'endgameDns',
  },
  {
    count: data.endgameFile ?? 0,
    title: <FormattedMessage id="xpack.siem.overview.endgameFileTitle" defaultMessage="File" />,
    id: 'endgameFile',
  },
  {
    count: data.endgameImageLoad ?? 0,
    title: (
      <FormattedMessage
        id="xpack.siem.overview.endgameImageLoadTitle"
        defaultMessage="Image Load"
      />
    ),
    id: 'endgameImageLoad',
  },
  {
    count: data.endgameNetwork ?? 0,
    title: (
      <FormattedMessage id="xpack.siem.overview.endgameNetworkTitle" defaultMessage="Network" />
    ),
    id: 'endgameNetwork',
  },
  {
    count: data.endgameProcess ?? 0,
    title: (
      <FormattedMessage id="xpack.siem.overview.endgameProcessTitle" defaultMessage="Process" />
    ),
    id: 'endgameProcess',
  },
  {
    count: data.endgameRegistry ?? 0,
    title: (
      <FormattedMessage id="xpack.siem.overview.endgameRegistryTitle" defaultMessage="Registry" />
    ),
    id: 'endgameRegistry',
  },
  {
    count: data.endgameSecurity ?? 0,
    title: (
      <FormattedMessage id="xpack.siem.overview.endgameSecurityTitle" defaultMessage="Security" />
    ),
    id: 'endgameSecurity',
  },
  {
    count: data.filebeatSystemModule ?? 0,
    title: (
      <FormattedMessage
        id="xpack.siem.overview.filebeatSystemModuleTitle"
        defaultMessage="System Module"
      />
    ),
    id: 'filebeatSystemModule',
  },
  {
    count: data.winlogbeat ?? 0,
    title: (
      <FormattedMessage id="xpack.siem.overview.winlogbeatTitle" defaultMessage="Winlogbeat" />
    ),
    id: 'winlogbeat',
  },
];

const HostStatsContainer = styled.div`
  .accordion-button {
    width: 100%;
  }
`;

const hostStatGroups: StatGroup[] = [
  {
    groupId: 'auditbeat',
    name: (
      <FormattedMessage
        id="xpack.siem.overview.hostStatGroupAuditbeat"
        defaultMessage="Auditbeat"
      />
    ),
    statIds: [
      'auditbeatAuditd',
      'auditbeatFIM',
      'auditbeatLogin',
      'auditbeatPackage',
      'auditbeatProcess',
      'auditbeatUser',
    ],
  },
  {
    groupId: 'endgame',
    name: (
      <FormattedMessage
        id="xpack.siem.overview.hostStatGroupElasticEndpointSecurity"
        defaultMessage="Elastic Endpoint Security"
      />
    ),
    statIds: [
      'endgameDns',
      'endgameFile',
      'endgameImageLoad',
      'endgameNetwork',
      'endgameProcess',
      'endgameRegistry',
      'endgameSecurity',
    ],
  },
  {
    groupId: 'filebeat',
    name: (
      <FormattedMessage id="xpack.siem.overview.hostStatGroupFilebeat" defaultMessage="Filebeat" />
    ),
    statIds: ['filebeatSystemModule'],
  },
  {
    groupId: 'winlogbeat',
    name: (
      <FormattedMessage
        id="xpack.siem.overview.hostStatGroupWinlogbeat"
        defaultMessage="Winlogbeat"
      />
    ),
    statIds: ['winlogbeat'],
  },
];

const Title = styled.div`
  margin-left: 24px;
`;

export const OverviewHostStats = React.memo<OverviewHostProps>(({ data, loading }) => {
  const allHostStats = getOverviewHostStats(data);
  const allHostStatsCount = allHostStats.reduce((total, stat) => total + stat.count, 0);

  return (
    <HostStatsContainer data-test-subj="overview-hosts-stats">
      {hostStatGroups.map((statGroup, i) => {
        const statsForGroup = allHostStats.filter(s => statGroup.statIds.includes(s.id));
        const statsForGroupCount = statsForGroup.reduce((total, stat) => total + stat.count, 0);

        const accordionButton = useMemo(
          () => (
            <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiText>{statGroup.name}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <StatValue
                  count={statsForGroupCount}
                  isGroupStat={true}
                  isLoading={loading}
                  max={allHostStatsCount}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
          [statGroup, statsForGroupCount, loading, allHostStatsCount]
        );

        return (
          <React.Fragment key={statGroup.groupId}>
            <EuiAccordion
              id={`host-stat-accordion-group${statGroup.groupId}`}
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
                  <EuiFlexItem data-test-subj={`host-stat-${stat.id}`} grow={false}>
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
            {i !== hostStatGroups.length - 1 && <EuiHorizontalRule margin="xs" />}
          </React.Fragment>
        );
      })}
    </HostStatsContainer>
  );
});

OverviewHostStats.displayName = 'OverviewHostStats';
