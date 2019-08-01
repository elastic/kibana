/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import React from 'react';
import { StaticIndexPattern } from 'ui/index_patterns';

import {
  GeoItem,
  FlowDirection,
  FlowTarget,
  NetworkTopNFlowEdges,
  TopNFlowItem,
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
import { getRowItemDraggables } from '../../../tables/helpers';
import { PreferenceFormattedBytes } from '../../../formatted_bytes';
import { asArrayIfExists } from '../../../../lib/helpers';
import { GeoFields } from '../../../source_destination/geo_fields';

export type NetworkTopNFlowColumns = [
  Columns<NetworkTopNFlowEdges>,
  Columns<NetworkTopNFlowEdges>,
  Columns<TopNFlowItem['location'], NetworkTopNFlowEdges>,
  Columns<TopNFlowItem['autonomous_system'], NetworkTopNFlowEdges>,
  Columns<TopNFlowNetworkEcsField['bytes_in']>,
  Columns<TopNFlowNetworkEcsField['bytes_out']>
];

export const getNetworkTopNFlowColumns = (
  indexPattern: StaticIndexPattern,
  flowDirection: FlowDirection,
  flowTarget: FlowTarget.source | FlowTarget.destination | FlowTarget.unified,
  type: networkModel.NetworkType,
  tableId: string
): NetworkTopNFlowColumns => [
  {
    name: i18n.IP_TITLE,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const ipAttr = `${flowTarget}.ip`;
      const ip: string | null = get(ipAttr, node);
      const id = escapeDataProviderId(`${tableId}-table-${flowTarget}-${flowDirection}-ip-${ip}`);

      if (ip != null) {
        const dataProvider =
          flowTarget === FlowTarget.unified
            ? {
                and: [],
                enabled: true,
                id,
                name: ip,
                excluded: false,
                kqlQuery: `( destination.ip: ${ip} )`, // this shit still aint working dand d00d
                queryMatch: { field: 'source.ip', value: ip, operator: IS_OPERATOR },
              }
            : {
                and: [],
                enabled: true,
                id,
                name: ip,
                excluded: false,
                kqlQuery: '',
                queryMatch: { field: ipAttr, value: ip, operator: IS_OPERATOR },
              };
        return (
          <DraggableWrapper
            key={id}
            dataProvider={dataProvider}
            render={(theDataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={theDataProvider} />
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
      const domainKql = `${flowTarget === FlowTarget.unified ? '*' : flowTarget}.domain`;
      const ipAttr = `${flowTarget}.ip`;
      const domains: string[] = get(domainAttr, node);
      const ip: string | null = get(ipAttr, node);

      if (Array.isArray(domains) && domains.length > 0) {
        const id = escapeDataProviderId(`${tableId}-table-${ip}-${flowDirection}`);
        return getRowItemDraggables({
          rowItems: domains,
          attrName: domainKql,
          idPrefix: id,
          displayCount: 1,
        });
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    field: `node.${flowTarget}.location`,
    name: i18n.LOCATION,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: (location, { cursor: { value: ipAddress } }) => {
      const makeGeoFields = ({ geo, flowTarget: flowTargetTarget }: GeoItem) =>
        geo
          ? {
              [`${flowTargetTarget}GeoCountryIsoCode`]: asArrayIfExists(
                geo.country_iso_code ? geo.country_iso_code : ''
              ),
            }
          : {};
      if (
        location &&
        (location.flowTarget === FlowTarget.source ||
          location.flowTarget === FlowTarget.destination)
      ) {
        const id = escapeDataProviderId(
          `${tableId}-table-${flowTarget}-${flowDirection}-ip-${ipAddress}`
        );
        return (
          <GeoFields
            type={location.flowTarget}
            {...makeGeoFields(location)}
            contextId={tableId}
            eventId={id}
            displayFullCountryName={true}
            hideTooltipContent={true}
          />
        );
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    field: `node.${flowTarget}.autonomous_system`,
    name: i18n.AUTONOMOUS_SYSTEM,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: (as, { cursor: { value: ipAddress } }) => {
      if (as != null) {
        const id = escapeDataProviderId(
          `${tableId}-table-${flowTarget}-${flowDirection}-ip-${ipAddress}`
        );
        const attrFlowTarget = FlowTarget.unified ? FlowTarget.source : flowTarget;
        if (as.name && as.number) {
          return (
            <>
              {getRowItemDraggables({
                rowItems: [as.name],
                attrName: `${attrFlowTarget}.as.organization.name`,
                idPrefix: `${id}-name`,
              })}
              <span style={{ width: '5px' }} />
              {getRowItemDraggables({
                rowItems: [`(${as.number})`],
                attrName: `${attrFlowTarget}.as.number`,
                idPrefix: `${id}-number`,
              })}
            </>
          );
        }
        return (
          <>
            {as.name &&
              getRowItemDraggables({
                rowItems: [as.name],
                attrName: `${attrFlowTarget}.as.organization.name`,
                idPrefix: `${id}-name`,
              })}
            {as.number &&
              getRowItemDraggables({
                rowItems: [`${as.number}`],
                attrName: `${attrFlowTarget}.as.number`,
                idPrefix: `${id}-number`,
              })}
          </>
        );
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    field: 'node.network.bytes_in',
    name: i18n.BYTES_IN,
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
    field: 'node.network.bytes_out',
    name: i18n.BYTES_OUT,
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
];
