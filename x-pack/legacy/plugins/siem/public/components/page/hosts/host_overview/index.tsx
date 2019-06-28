/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDescriptionList, EuiFlexItem } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { HostItem } from '../../../../graphql/types';
import { getEmptyTagValue } from '../../../empty_value';

import * as i18n from './translations';
import { FirstLastSeenHost, FirstLastSeenHostType } from '../first_last_seen_host';
import { DefaultFieldRenderer, hostIdRenderer } from '../../../field_renderers/field_renderers';
import { LoadingPanel } from '../../../loading';
import { LoadingOverlay, OverviewWrapper } from '../../index';
import { IPDetailsLink } from '../../../links';

interface DescriptionList {
  title: string;
  description: JSX.Element;
}

interface OwnProps {
  data: HostItem;
  loading: boolean;
}

type HostSummaryProps = OwnProps;

const DescriptionList = styled(EuiDescriptionList)`
  ${({ theme }) => `
    dt {
      font-size: ${theme.eui.euiFontSizeXS} !important;
    }
  `}
`;

const getDescriptionList = (descriptionList: DescriptionList[], key: number) => (
  <EuiFlexItem key={key}>
    <DescriptionList listItems={descriptionList} />
  </EuiFlexItem>
);

export const HostOverview = pure<HostSummaryProps>(({ data, loading }) => {
  const getDefaultRenderer = (fieldName: string, fieldData: HostItem) => (
    <DefaultFieldRenderer
      rowItems={getOr([], fieldName, fieldData)}
      attrName={fieldName}
      idPrefix="host-overview"
    />
  );

  const descriptionLists: Readonly<DescriptionList[][]> = [
    [
      {
        title: i18n.HOST_ID,
        description: data.host
          ? hostIdRenderer({ host: data.host, noLink: true })
          : getEmptyTagValue(),
      },
      {
        title: i18n.FIRST_SEEN,
        description:
          data.host != null && data.host.name && data.host.name.length ? (
            <FirstLastSeenHost
              hostname={data.host.name[0]}
              type={FirstLastSeenHostType.FIRST_SEEN}
            />
          ) : (
            getEmptyTagValue()
          ),
      },
      {
        title: i18n.LAST_SEEN,
        description:
          data.host != null && data.host.name && data.host.name.length ? (
            <FirstLastSeenHost
              hostname={data.host.name[0]}
              type={FirstLastSeenHostType.LAST_SEEN}
            />
          ) : (
            getEmptyTagValue()
          ),
      },
    ],
    [
      {
        title: i18n.IP_ADDRESSES,
        description: (
          <DefaultFieldRenderer
            rowItems={getOr([], 'host.ip', data)}
            attrName={'host.ip'}
            idPrefix="host-overview"
            render={ip => (ip != null ? <IPDetailsLink ip={ip} /> : getEmptyTagValue())}
          />
        ),
      },
      {
        title: i18n.MAC_ADDRESSES,
        description: getDefaultRenderer('host.mac', data),
      },
      { title: i18n.PLATFORM, description: getDefaultRenderer('host.os.platform', data) },
    ],
    [
      { title: i18n.OS, description: getDefaultRenderer('host.os.name', data) },
      { title: i18n.FAMILY, description: getDefaultRenderer('host.os.family', data) },
      { title: i18n.VERSION, description: getDefaultRenderer('host.os.version', data) },
      { title: i18n.ARCHITECTURE, description: getDefaultRenderer('host.architecture', data) },
    ],
    [
      {
        title: i18n.CLOUD_PROVIDER,
        description: getDefaultRenderer('cloud.provider', data),
      },
      {
        title: i18n.REGION,
        description: getDefaultRenderer('cloud.region', data),
      },
      {
        title: i18n.INSTANCE_ID,
        description: getDefaultRenderer('cloud.instance.id', data),
      },
      {
        title: i18n.MACHINE_TYPE,
        description: getDefaultRenderer('cloud.machine.type', data),
      },
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
