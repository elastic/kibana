/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDescriptionList, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { FlowTarget, IpOverviewData, Overview } from '../../../../graphql/types';
import { networkModel } from '../../../../store';
import { getEmptyTagValue } from '../../../empty_value';

import {
  autonomousSystemRenderer,
  dateRenderer,
  hostIdRenderer,
  hostNameRenderer,
  locationRenderer,
  reputationRenderer,
  whoisRenderer,
} from '../../../field_renderers/field_renderers';
import * as i18n from './translations';
import { LoadingOverlay, OverviewWrapper } from '../../index';
import { LoadingPanel } from '../../../loading';

interface DescriptionList {
  title: string;
  description: JSX.Element;
}

interface OwnProps {
  data: IpOverviewData;
  flowTarget: FlowTarget;
  ip: string;
  loading: boolean;
  type: networkModel.NetworkType;
}

export type IpOverviewProps = OwnProps;

const DescriptionList = styled(EuiDescriptionList)`
  ${({ theme }) => `
    dt {
      font-size: ${theme.eui.euiFontSizeXS} !important;
    }
  `}
`;

const getDescriptionList = (descriptionList: DescriptionList[], key: number) => {
  return (
    <EuiFlexItem key={key}>
      <DescriptionList listItems={descriptionList} />
    </EuiFlexItem>
  );
};

export const IpOverview = pure<IpOverviewProps>(({ ip, data, loading, flowTarget }) => {
  const typeData: Overview = data[flowTarget]!;
  const descriptionLists: Readonly<DescriptionList[][]> = [
    [
      {
        title: i18n.LOCATION,
        description: locationRenderer(
          [`${flowTarget}.geo.city_name`, `${flowTarget}.geo.region_name`],
          data
        ),
      },
      {
        title: i18n.AUTONOMOUS_SYSTEM,
        description: typeData
          ? autonomousSystemRenderer(typeData.autonomousSystem, flowTarget)
          : getEmptyTagValue(),
      },
    ],
    [
      { title: i18n.FIRST_SEEN, description: dateRenderer('firstSeen', typeData) },
      { title: i18n.LAST_SEEN, description: dateRenderer('lastSeen', typeData) },
    ],
    [
      {
        title: i18n.HOST_ID,
        description: typeData
          ? hostIdRenderer({ host: data.host, ipFilter: ip })
          : getEmptyTagValue(),
      },
      {
        title: i18n.HOST_NAME,
        description: typeData ? hostNameRenderer(data.host, ip) : getEmptyTagValue(),
      },
    ],
    [
      { title: i18n.WHOIS, description: whoisRenderer(ip) },
      { title: i18n.REPUTATION, description: reputationRenderer(ip) },
    ],
  ];
  return (
    <OverviewWrapper>
      {loading && (
        <>
          <LoadingOverlay />
          <LoadingPanel
            height="100%"
            width="100%"
            text=""
            position="absolute"
            zIndex={3}
            data-test-subj="LoadingPanelLoadMoreTable"
          />
        </>
      )}
      {descriptionLists.map((descriptionList, index) => getDescriptionList(descriptionList, index))}
    </OverviewWrapper>
  );
});
