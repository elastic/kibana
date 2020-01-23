/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { getEmptyTagValue } from '../../../../components/empty_value';
import { Columns } from '../../../../components/paginated_table';
import { CaseSavedObject } from '../../../../containers/case/types';
import { FormattedRelativePreferenceDate } from '../../../../components/formatted_date';
import { CaseDetailsLink } from '../../../../components/links';

export type CasesColumns = [
  Columns<CaseSavedObject['attributes']['title']>,
  Columns<CaseSavedObject['id']>,
  Columns<CaseSavedObject['attributes']['created_at']>,
  Columns<CaseSavedObject['attributes']['created_by']['username']>,
  Columns<CaseSavedObject['updated_at']>,
  Columns<CaseSavedObject['attributes']['state']>
];

const renderStringField = (field: string) => (field != null ? field : getEmptyTagValue());

export const getCasesColumns = (): CasesColumns => [
  {
    field: 'attributes.title',
    name: 'Case Title',
    render: title => renderStringField(title),
  },
  {
    field: 'id',
    name: 'Case Id',
    render: id => {
      if (id != null) {
        return <CaseDetailsLink detailName={id} />;
      }
      return getEmptyTagValue();
    },
  },
  {
    field: 'attributes.created_at',
    name: 'Created at',
    sortable: true,
    render: createdAt => {
      if (createdAt != null) {
        return <FormattedRelativePreferenceDate value={createdAt} />;
      }
      return getEmptyTagValue();
    },
  },
  {
    field: 'attributes.created_by.username',
    name: 'Created by',
    render: createdBy => renderStringField(createdBy),
  },
  {
    field: 'updated_at',
    name: 'Last updated',
    sortable: true,
    render: updatedAt => {
      if (updatedAt != null) {
        return <FormattedRelativePreferenceDate value={updatedAt} />;
      }
      return getEmptyTagValue();
    },
  },
  {
    field: 'attributes.state',
    name: 'State',
    sortable: true,
    render: state => renderStringField(state),
  },
];
