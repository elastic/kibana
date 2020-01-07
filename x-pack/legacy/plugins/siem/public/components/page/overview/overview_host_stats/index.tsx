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

import { OverviewHostData } from '../../../../graphql/types';
import { getEmptyTagValue } from '../../../empty_value';

interface OverviewHostProps {
  data: OverviewHostData;
  loading: boolean;
}

// eslint-disable-next-line complexity
const overviewHostStats = (data: OverviewHostData) => [
  {
    description:
      has('auditbeatAuditd', data) && data.auditbeatAuditd !== null
        ? numeral(data.auditbeatAuditd).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        defaultMessage="Auditbeat Audit"
        id="xpack.siem.overview.auditBeatAuditTitle"
      />
    ),
    id: 'auditbeatAuditd',
  },
  {
    description:
      has('auditbeatFIM', data) && data.auditbeatFIM !== null
        ? numeral(data.auditbeatFIM).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        defaultMessage="Auditbeat File Integrity Module"
        id="xpack.siem.overview.auditBeatFimTitle"
      />
    ),
    id: 'auditbeatFIM',
  },
  {
    description:
      has('auditbeatLogin', data) && data.auditbeatLogin !== null
        ? numeral(data.auditbeatLogin).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        defaultMessage="Auditbeat Login"
        id="xpack.siem.overview.auditBeatLoginTitle"
      />
    ),
    id: 'auditbeatLogin',
  },
  {
    description:
      has('auditbeatPackage', data) && data.auditbeatPackage !== null
        ? numeral(data.auditbeatPackage).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        defaultMessage="Auditbeat Package"
        id="xpack.siem.overview.auditBeatPackageTitle"
      />
    ),
    id: 'auditbeatPackage',
  },
  {
    description:
      has('auditbeatProcess', data) && data.auditbeatProcess !== null
        ? numeral(data.auditbeatProcess).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        defaultMessage="Auditbeat Process"
        id="xpack.siem.overview.auditBeatProcessTitle"
      />
    ),
    id: 'auditbeatProcess',
  },
  {
    description:
      has('auditbeatUser', data) && data.auditbeatUser !== null
        ? numeral(data.auditbeatUser).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        defaultMessage="Auditbeat User"
        id="xpack.siem.overview.auditBeatUserTitle"
      />
    ),
    id: 'auditbeatUser',
  },
  {
    description:
      has('endgameDns', data) && data.endgameDns !== null
        ? numeral(data.endgameDns).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage defaultMessage="Endgame DNS" id="xpack.siem.overview.endgameDnsTitle" />
    ),
    id: 'endgameDns',
  },
  {
    description:
      has('endgameFile', data) && data.endgameFile !== null
        ? numeral(data.endgameFile).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage defaultMessage="Endgame File" id="xpack.siem.overview.endgameFileTitle" />
    ),
    id: 'endgameFile',
  },
  {
    description:
      has('endgameImageLoad', data) && data.endgameImageLoad !== null
        ? numeral(data.endgameImageLoad).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        defaultMessage="Endgame Image Load"
        id="xpack.siem.overview.endgameImageLoadTitle"
      />
    ),
    id: 'endgameImageLoad',
  },
  {
    description:
      has('endgameNetwork', data) && data.endgameNetwork !== null
        ? numeral(data.endgameNetwork).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        defaultMessage="Endgame Network"
        id="xpack.siem.overview.endgameNetworkTitle"
      />
    ),
    id: 'endgameNetwork',
  },
  {
    description:
      has('endgameProcess', data) && data.endgameProcess !== null
        ? numeral(data.endgameProcess).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        defaultMessage="Endgame Process"
        id="xpack.siem.overview.endgameProcessTitle"
      />
    ),
    id: 'endgameProcess',
  },
  {
    description:
      has('endgameRegistry', data) && data.endgameRegistry !== null
        ? numeral(data.endgameRegistry).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        defaultMessage="Endgame Registry"
        id="xpack.siem.overview.endgameRegistryTitle"
      />
    ),
    id: 'endgameRegistry',
  },
  {
    description:
      has('endgameSecurity', data) && data.endgameSecurity !== null
        ? numeral(data.endgameSecurity).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        defaultMessage="Endgame Security"
        id="xpack.siem.overview.endgameSecurityTitle"
      />
    ),
    id: 'endgameSecurity',
  },
  {
    description:
      has('filebeatSystemModule', data) && data.filebeatSystemModule !== null
        ? numeral(data.filebeatSystemModule).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        defaultMessage="Filebeat System Module"
        id="xpack.siem.overview.filebeatSystemModuleTitle"
      />
    ),
    id: 'filebeatSystemModule',
  },
  {
    description:
      has('winlogbeat', data) && data.winlogbeat !== null
        ? numeral(data.winlogbeat).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage defaultMessage="Winlogbeat" id="xpack.siem.overview.winlogbeatTitle" />
    ),
    id: 'winlogbeat',
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

export const OverviewHostStats = React.memo<OverviewHostProps>(({ data, loading }) => (
  <EuiDescriptionList type="column">
    {overviewHostStats(data).map((item, index) => (
      <React.Fragment key={index}>
        <EuiDescriptionListTitle>{item.title}</EuiDescriptionListTitle>
        <DescriptionListDescription data-test-subj={`host-stat-${item.id}`}>
          <StatValue isLoading={loading} value={item.description} />
        </DescriptionListDescription>
      </React.Fragment>
    ))}
  </EuiDescriptionList>
));

OverviewHostStats.displayName = 'OverviewHostStats';
