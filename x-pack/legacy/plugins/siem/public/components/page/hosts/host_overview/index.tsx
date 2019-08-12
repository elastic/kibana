/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDescriptionList, EuiFlexItem } from '@elastic/eui';
import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import { getOr } from 'lodash/fp';
import React, { useContext, useState } from 'react';
import styled from 'styled-components';

import { DescriptionList } from '../../../../../common/utility_types';
import { getEmptyTagValue } from '../../../empty_value';
import { DefaultFieldRenderer, hostIdRenderer } from '../../../field_renderers/field_renderers';
import { InspectButton } from '../../../inspect';
import { HostItem } from '../../../../graphql/types';
import { Loader } from '../../../loader';
import { IPDetailsLink } from '../../../links';
import { MlCapabilitiesContext } from '../../../ml/permissions/ml_capabilities_provider';
import { hasMlUserPermissions } from '../../../ml/permissions/has_ml_user_permissions';
import { AnomalyScores } from '../../../ml/score/anomaly_scores';
import { Anomalies, NarrowDateRange } from '../../../ml/types';
import { OverviewWrapper } from '../../index';
import { FirstLastSeenHost, FirstLastSeenHostType } from '../first_last_seen_host';

import * as i18n from './translations';
import { KibanaConfigContext } from '../../../../lib/adapters/framework/kibana_framework_adapter';

interface HostSummaryProps {
  data: HostItem;
  id: string;
  loading: boolean;
  isLoadingAnomaliesData: boolean;
  anomaliesData: Anomalies | null;
  startDate: number;
  endDate: number;
  narrowDateRange: NarrowDateRange;
}

const DescriptionListStyled = styled(EuiDescriptionList)`
  ${({ theme }) => `
    dt {
      font-size: ${theme.eui.euiFontSizeXS} !important;
    }
  `}
`;

DescriptionListStyled.displayName = 'DescriptionListStyled';

const getDescriptionList = (descriptionList: DescriptionList[], key: number) => (
  <EuiFlexItem key={key}>
    <DescriptionListStyled listItems={descriptionList} />
  </EuiFlexItem>
);

export const HostOverview = React.memo<HostSummaryProps>(
  ({
    data,
    loading,
    id,
    startDate,
    endDate,
    isLoadingAnomaliesData,
    anomaliesData,
    narrowDateRange,
  }) => {
    const [showInspect, setShowInspect] = useState(false);
    const capabilities = useContext(MlCapabilitiesContext);
    const userPermissions = hasMlUserPermissions(capabilities);
    const config = useContext(KibanaConfigContext);

    const getDefaultRenderer = (fieldName: string, fieldData: HostItem) => (
      <DefaultFieldRenderer
        rowItems={getOr([], fieldName, fieldData)}
        attrName={fieldName}
        idPrefix="host-overview"
      />
    );

    const column: DescriptionList[] = [
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
    ];
    const firstColumn = userPermissions
      ? [
          ...column,
          {
            title: i18n.MAX_ANOMALY_SCORE_BY_JOB,
            description: (
              <AnomalyScores
                anomalies={anomaliesData}
                startDate={startDate}
                endDate={endDate}
                isLoading={isLoadingAnomaliesData}
                narrowDateRange={narrowDateRange}
              />
            ),
          },
        ]
      : column;

    const descriptionLists: Readonly<DescriptionList[][]> = [
      firstColumn,
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
      <OverviewWrapper
        onMouseEnter={() => setShowInspect(true)}
        onMouseLeave={() => setShowInspect(false)}
      >
        <InspectButton
          queryId={id}
          show={showInspect}
          title={i18n.INSPECT_TITLE}
          inspectIndex={0}
        />

        {descriptionLists.map((descriptionList, index) =>
          getDescriptionList(descriptionList, index)
        )}

        {loading && (
          <Loader
            overlay
            overlayBackground={
              config.darkMode ? darkTheme.euiPageBackgroundColor : lightTheme.euiPageBackgroundColor
            }
            size="xl"
          />
        )}
      </OverviewWrapper>
    );
  }
);

HostOverview.displayName = 'HostOverview';
