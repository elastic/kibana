/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import numeral from '@elastic/numeral';
import { NetworkHttpFields, NetworkHttpItem } from '../../../../graphql/types';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { getEmptyTagValue } from '../../../empty_value';
import { Columns } from '../../../paginated_table';

import * as i18n from './translations';
import { getRowItemDraggable, getRowItemDraggables } from '../../../tables/helpers';
export type NetworkHttpColumns = [
  Columns<NetworkHttpItem['methods']>,
  Columns<NetworkHttpItem['domains']>,
  Columns<NetworkHttpItem['path']>,
  Columns<NetworkHttpItem['statuses']>,
  Columns<NetworkHttpItem['lastHost']>,
  Columns<NetworkHttpItem['lastSourceIp']>,
  Columns<NetworkHttpItem['requestCount']>
];

export const getNetworkHttpColumns = (tableId: string): NetworkHttpColumns => [
  {
    field: `node.${NetworkHttpFields.methods}`,
    name: i18n.METHOD,
    render: methods =>
      Array.isArray(methods) && methods.length > 0
        ? getRowItemDraggables({
            attrName: 'http.request.method',
            displayCount: 3,
            idPrefix: escapeDataProviderId(`${tableId}-table-methods`),
            rowItems: methods,
          })
        : getEmptyTagValue(),
  },
  {
    field: `node.${NetworkHttpFields.domains}`,
    name: i18n.DOMAIN,
    render: domains =>
      Array.isArray(domains) && domains.length > 0
        ? getRowItemDraggables({
            attrName: 'url.domain',
            displayCount: 3,
            idPrefix: escapeDataProviderId(`${tableId}-table-domains`),
            rowItems: domains,
          })
        : getEmptyTagValue(),
  },
  {
    field: `node.${NetworkHttpFields.path}`,
    name: i18n.PATH,
    render: path =>
      path != null
        ? getRowItemDraggable({
            attrName: 'url.path',
            idPrefix: escapeDataProviderId(`${tableId}-table-path`),
            rowItem: path,
          })
        : getEmptyTagValue(),
  },
  {
    field: `node.${NetworkHttpFields.statuses}`,
    name: i18n.STATUS,
    render: statuses =>
      Array.isArray(statuses) && statuses.length > 0
        ? getRowItemDraggables({
            attrName: 'http.response.status_code',
            displayCount: 3,
            idPrefix: escapeDataProviderId(`${tableId}-table-statuses`),
            rowItems: statuses,
          })
        : getEmptyTagValue(),
  },
  {
    field: `node.${NetworkHttpFields.lastHost}`,
    name: i18n.LAST_HOST,
    render: lastHost =>
      lastHost != null
        ? getRowItemDraggable({
            attrName: 'host.name',
            idPrefix: escapeDataProviderId(`${tableId}-table-lastHost`),
            rowItem: lastHost,
          })
        : getEmptyTagValue(),
  },
  {
    field: `node.${NetworkHttpFields.lastSourceIp}`,
    name: i18n.LAST_SOURCE_IP,
    render: lastSourceIp =>
      lastSourceIp != null
        ? getRowItemDraggable({
            attrName: 'source.ip',
            idPrefix: escapeDataProviderId(`${tableId}-table-lastSourceIp`),
            rowItem: lastSourceIp,
          })
        : getEmptyTagValue(),
  },
  {
    align: 'right',
    field: `node.${NetworkHttpFields.requestCount}`,
    name: i18n.REQUESTS,
    sortable: true,
    render: requestCount => {
      if (requestCount != null) {
        return numeral(requestCount).format('0,000');
      } else {
        return getEmptyTagValue();
      }
    },
  },
];
