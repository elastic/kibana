/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import numeral from '@elastic/numeral';
import React from 'react';
import { StaticIndexPattern } from 'ui/index_patterns';

import { CountryFlag } from '../../../source_destination/country_flag';
import {
  AutonomousSystemItem,
  FlowTargetNew,
  NetworkTopNFlowEdges,
  TopNFlowNetworkEcsField,
} from '../../../../graphql/types';
import { networkModel } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { getEmptyTagValue } from '../../../empty_value';
import { IPDetailsLink } from '../../../links';
import { Columns } from '../../../load_more_table';
import { IS_OPERATOR } from '../../../timeline/data_providers/data_provider';
import { Provider } from '../../../timeline/data_providers/provider';
import * as i18n from './translations';
import { getRowItemDraggable, getRowItemDraggables } from '../../../tables/helpers';
import { PreferenceFormattedBytes } from '../../../formatted_bytes';

export type NetworkTopNFlowColumns = [
  Columns<NetworkTopNFlowEdges>,
  Columns<NetworkTopNFlowEdges>,
  Columns<NetworkTopNFlowEdges>,
  Columns<TopNFlowNetworkEcsField['bytes_in']>,
  Columns<TopNFlowNetworkEcsField['bytes_out']>,
  Columns<NetworkTopNFlowEdges>,
  Columns<NetworkTopNFlowEdges>
];

export const getNetworkTopNFlowColumns = (
  indexPattern: StaticIndexPattern,
  flowTarget: FlowTargetNew,
  type: networkModel.NetworkType,
  tableId: string
): NetworkTopNFlowColumns => [
  {
    name: i18n.IP_TITLE,
    render: ({ node }) => {
      const ipAttr = `${flowTarget}.ip`;
      const ip: string | null = get(ipAttr, node);
      const geoAttr = `${flowTarget}.location.geo.country_iso_code[0]`;
      const geoAttrName = `${flowTarget}.geo.country_iso_code`;
      const geo: string | null = get(geoAttr, node);
      const id = escapeDataProviderId(`${tableId}-table-${flowTarget}-ip-${ip}`);

      if (ip != null) {
        return (
          <>
            <DraggableWrapper
              key={id}
              dataProvider={{
                and: [],
                enabled: true,
                id,
                name: ip,
                excluded: false,
                kqlQuery: '',
                queryMatch: { field: ipAttr, value: ip, operator: IS_OPERATOR },
              }}
              render={(dataProvider, _, snapshot) =>
                snapshot.isDragging ? (
                  <DragEffects>
                    <Provider dataProvider={dataProvider} />
                  </DragEffects>
                ) : (
                  <IPDetailsLink ip={ip} />
                )
              }
            />

            {geo && (
              <DraggableWrapper
                key={`${id}-${geo}`}
                dataProvider={{
                  and: [],
                  enabled: true,
                  id: `${id}-${geo}`,
                  name: geo,
                  excluded: false,
                  kqlQuery: '',
                  queryMatch: { field: geoAttrName, value: geo, operator: IS_OPERATOR },
                }}
                render={(dataProvider, _, snapshot) =>
                  snapshot.isDragging ? (
                    <DragEffects>
                      <Provider dataProvider={dataProvider} />
                    </DragEffects>
                  ) : (
                    <>
                      {' '}
                      <CountryFlag countryCode={geo} /> {geo}
                    </>
                  )
                }
              />
            )}
          </>
        );
      } else {
        return getEmptyTagValue();
      }
    },
    width: '15%',
  },
  {
    name: i18n.DOMAIN,
    render: ({ node }) => {
      const domainAttr = `${flowTarget}.domain`;
      const ipAttr = `${flowTarget}.ip`;
      const domains: string[] = get(domainAttr, node);
      const ip: string | null = get(ipAttr, node);

      if (Array.isArray(domains) && domains.length > 0) {
        const id = escapeDataProviderId(`${tableId}-table-${ip}`);
        return getRowItemDraggables({
          rowItems: domains,
          attrName: domainAttr,
          idPrefix: id,
          displayCount: 1,
        });
      } else {
        return getEmptyTagValue();
      }
    },
    width: '20%',
  },
  {
    name: i18n.AUTONOMOUS_SYSTEM,
    render: ({ node, cursor: { value: ipAddress } }) => {
      const asAttr = `${flowTarget}.autonomous_system`;
      const as: AutonomousSystemItem | null = get(asAttr, node);
      if (as != null) {
        const id = escapeDataProviderId(`${tableId}-table-${flowTarget}-ip-${ipAddress}`);
        return (
          <>
            {as.name &&
              getRowItemDraggable({
                rowItem: as.name,
                attrName: `${flowTarget}.as.organization.name`,
                idPrefix: `${id}-name`,
              })}
            {as.number &&
              getRowItemDraggable({
                rowItem: `${as.number}`,
                attrName: `${flowTarget}.as.number`,
                idPrefix: `${id}-number`,
              })}
          </>
        );
      } else {
        return getEmptyTagValue();
      }
    },
    width: '20%',
  },
  {
    align: 'right',
    field: 'node.network.bytes_in',
    name: i18n.BYTES_IN,
    sortable: true,
    render: bytes => {
      if (bytes != null) {
        return <PreferenceFormattedBytes value={bytes} />;
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    align: 'right',
    field: 'node.network.bytes_out',
    name: i18n.BYTES_OUT,
    sortable: true,
    render: bytes => {
      if (bytes != null) {
        return <PreferenceFormattedBytes value={bytes} />;
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    align: 'right',
    field: `node.${flowTarget}.flows`,
    name: i18n.FLOWS,
    sortable: true,
    render: flows => {
      if (flows != null) {
        return numeral(flows).format('0,000');
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    align: 'right',
    field: `node.${flowTarget}.${getOppositeField(flowTarget)}_ips`,
    name: flowTarget === FlowTargetNew.source ? i18n.DESTINATION_IPS : i18n.SOURCE_IPS,
    sortable: true,
    render: ips => {
      if (ips != null) {
        return numeral(ips).format('0,000');
      } else {
        return getEmptyTagValue();
      }
    },
  },
];

const getOppositeField = (flowTarget: FlowTargetNew): FlowTargetNew =>
  flowTarget === FlowTargetNew.source ? FlowTargetNew.destination : FlowTargetNew.source;
