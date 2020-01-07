/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React from 'react';
import moment from 'moment';
import { TlsNode } from '../../../../graphql/types';
import { Columns } from '../../../paginated_table';

import { getRowItemDraggables, getRowItemDraggable } from '../../../tables/helpers';
import { LocalizedDateTooltip } from '../../../localized_date_tooltip';
import { PreferenceFormattedDate } from '../../../formatted_date';

import * as i18n from './translations';

export type TlsColumns = [
  Columns<TlsNode>,
  Columns<TlsNode>,
  Columns<TlsNode['_id']>,
  Columns<TlsNode>,
  Columns<TlsNode>
];

export const getTlsColumns = (tableId: string): TlsColumns => [
  {
    field: 'node',
    name: i18n.ISSUER,
    truncateText: false,
    hideForMobile: false,
    sortable: false,
    render: ({ _id, issuerNames }) =>
      getRowItemDraggables({
        rowItems: issuerNames,
        attrName: 'tls.server_certificate.issuer.common_name',
        idPrefix: `${tableId}-${_id}-table-issuerNames`,
      }),
  },
  {
    field: 'node',
    name: i18n.SUBJECT,
    truncateText: false,
    hideForMobile: false,
    sortable: false,
    render: ({ _id, alternativeNames, commonNames }) =>
      alternativeNames != null && alternativeNames.length > 0
        ? getRowItemDraggables({
            rowItems: alternativeNames,
            attrName: 'tls.server_certificate.alternative_names',
            idPrefix: `${tableId}-${_id}-table-alternative-name`,
          })
        : getRowItemDraggables({
            rowItems: commonNames,
            attrName: 'tls.server_certificate.subject.common_name',
            idPrefix: `${tableId}-${_id}-table-common-name`,
          }),
  },
  {
    field: 'node._id',
    name: i18n.SHA1_FINGERPRINT,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: sha1 =>
      getRowItemDraggable({
        rowItem: sha1,
        attrName: 'tls.server_certificate.fingerprint.sha1',
        idPrefix: `${tableId}-${sha1}-table-sha1`,
      }),
  },
  {
    field: 'node',
    name: i18n.JA3_FINGERPRINT,
    truncateText: false,
    hideForMobile: false,
    sortable: false,
    render: ({ _id, ja3 }) =>
      getRowItemDraggables({
        rowItems: ja3,
        attrName: 'tls.fingerprints.ja3.hash',
        idPrefix: `${tableId}-${_id}-table-ja3`,
      }),
  },
  {
    field: 'node',
    name: i18n.VALID_UNTIL,
    truncateText: false,
    hideForMobile: false,
    sortable: false,
    render: ({ _id, notAfter }) =>
      getRowItemDraggables({
        rowItems: notAfter,
        attrName: 'tls.server_certificate.not_after',
        idPrefix: `${tableId}-${_id}-table-notAfter`,
        render: validUntil => (
          <LocalizedDateTooltip date={moment(new Date(validUntil)).toDate()}>
            <PreferenceFormattedDate value={new Date(validUntil)} />
          </LocalizedDateTooltip>
        ),
      }),
  },
];
