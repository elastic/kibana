/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import numeral from '@elastic/numeral';
import { get, isEmpty } from 'lodash/fp';
import React from 'react';
import { StaticIndexPattern } from 'ui/index_patterns';

import {
  FlowDirection,
  FlowTarget,
  TopNFlowNetworkEcsField,
  NetworkTopNFlowEdges,
  TopNFlowItem,
} from '../../../../graphql/types';
import { assertUnreachable } from '../../../../lib/helpers';
import { escapeQueryValue } from '../../../../lib/keury';
import { networkModel } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { defaultToEmptyTag, getEmptyTagValue } from '../../../empty_value';
import { IPDetailsLink } from '../../../links';
import { Columns } from '../../../load_more_table';
import { IS_OPERATOR } from '../../../timeline/data_providers/data_provider';
import { Provider } from '../../../timeline/data_providers/provider';
import { AddToKql } from '../../add_to_kql';

import * as i18n from './translations';
import { getRowItemDraggables } from '../../../tables/helpers';
import { PreferenceFormattedBytes } from '../../../formatted_bytes';

export const getNetworkTopNFlowColumns = (
  indexPattern: StaticIndexPattern,
  flowDirection: FlowDirection,
  flowTarget: FlowTarget,
  type: networkModel.NetworkType,
  tableId: string
): [
  Columns<NetworkTopNFlowEdges>,
  Columns<NetworkTopNFlowEdges>,
  Columns<TopNFlowNetworkEcsField['direction']>,
  Columns<TopNFlowNetworkEcsField['bytes']>,
  Columns<TopNFlowNetworkEcsField['packets']>,
  Columns<TopNFlowItem['count']>
] => [
  {
    name: getIpTitle(flowTarget),
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const ipAttr = `${flowTarget}.ip`;
      const ip: string | null = get(ipAttr, node);
      const id = escapeDataProviderId(`${tableId}-table-${flowTarget}-${flowDirection}-ip-${ip}`);
      if (ip != null) {
        return (
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
        );
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    name: i18n.DOMAIN,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const domainAttr = `${flowTarget}.domain`;
      const ipAttr = `${flowTarget}.ip`;
      const domains: string[] = get(domainAttr, node);
      const ip: string | null = get(ipAttr, node);

      if (Array.isArray(domains) && domains.length > 0) {
        const id = escapeDataProviderId(`${tableId}-table-${ip}-${flowDirection}`);
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
  },
  {
    field: 'node.network.direction',
    name: i18n.DIRECTION,
    truncateText: false,
    hideForMobile: false,
    render: directions =>
      isEmpty(directions)
        ? getEmptyTagValue()
        : directions &&
          directions.map((direction, index) => (
            <AddToKql
              indexPattern={indexPattern}
              key={escapeDataProviderId(
                `${tableId}-table-${flowTarget}-${flowDirection}-direction-${direction}`
              )}
              expression={`network.direction: "${escapeQueryValue(direction)}"`}
              componentFilterType="network"
              type={type}
            >
              <>
                {defaultToEmptyTag(direction)}
                {index < directions.length - 1 ? '\u00A0' : null}
              </>
            </AddToKql>
          )),
  },
  {
    field: 'node.network.bytes',
    name: i18n.BYTES,
    truncateText: false,
    hideForMobile: false,
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
    field: 'node.network.packets',
    name: i18n.PACKETS,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: packets => {
      if (packets != null) {
        return numeral(packets).format('0,000');
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    field: `node.${flowTarget}.count`,
    name: getUniqueTitle(flowTarget),
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: ipCount => {
      if (ipCount != null) {
        return numeral(ipCount).format('0,000');
      } else {
        return getEmptyTagValue();
      }
    },
  },
];

const getIpTitle = (flowTarget: FlowTarget) => {
  switch (flowTarget) {
    case FlowTarget.source:
      return i18n.SOURCE_IP;
    case FlowTarget.destination:
      return i18n.DESTINATION_IP;
    case FlowTarget.client:
      return i18n.CLIENT_IP;
    case FlowTarget.server:
      return i18n.SERVER_IP;
  }
  assertUnreachable(flowTarget);
};

const getUniqueTitle = (flowTarget: FlowTarget) => {
  switch (flowTarget) {
    case FlowTarget.source:
      return i18n.UNIQUE_DESTINATION_IP;
    case FlowTarget.destination:
      return i18n.UNIQUE_SOURCE_IP;
    case FlowTarget.client:
      return i18n.UNIQUE_SERVER_IP;
    case FlowTarget.server:
      return i18n.UNIQUE_CLIENT_IP;
  }
  assertUnreachable(flowTarget);
};
