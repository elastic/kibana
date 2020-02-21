/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiBadge, EuiTableFieldDataColumnType, EuiTableComputedColumnType } from '@elastic/eui';
import { getEmptyTagValue } from '../../../../components/empty_value';
import { Case } from '../../../../containers/case/types';
import { FormattedRelativePreferenceDate } from '../../../../components/formatted_date';
import { CaseDetailsLink } from '../../../../components/links';
import { TruncatableText } from '../../../../components/truncatable_text';
import * as i18n from './translations';

export type CasesColumns = EuiTableFieldDataColumnType<Case> | EuiTableComputedColumnType<Case>;

const renderStringField = (field: string) => (field != null ? field : getEmptyTagValue());

export const getCasesColumns = (): CasesColumns[] => [
  {
    name: i18n.CASE_TITLE,
    render: (theCase: Case) => {
      if (theCase.case_id != null && theCase.title != null) {
        return <CaseDetailsLink detailName={theCase.case_id}>{theCase.title}</CaseDetailsLink>;
      }
      return getEmptyTagValue();
    },
  },
  {
    field: 'tags',
    name: i18n.TAGS,
    render: (tags: Case['tags']) => {
      if (tags != null && tags.length > 0) {
        return (
          <TruncatableText>
            {tags.map((tag: string, i: number) => (
              <EuiBadge color="hollow" key={`${tag}-${i}`}>
                {tag}
              </EuiBadge>
            ))}
          </TruncatableText>
        );
      }
      return getEmptyTagValue();
    },
    truncateText: true,
  },
  {
    field: 'created_at',
    name: i18n.CREATED_AT,
    sortable: true,
    render: (createdAt: Case['created_at']) => {
      if (createdAt != null) {
        return <FormattedRelativePreferenceDate value={createdAt} />;
      }
      return getEmptyTagValue();
    },
  },
  {
    field: 'created_by.username',
    name: i18n.REPORTER,
    render: (createdBy: Case['created_by']['username']) => renderStringField(createdBy),
  },
  {
    field: 'updated_at',
    name: i18n.LAST_UPDATED,
    sortable: true,
    render: (updatedAt: Case['updated_at']) => {
      if (updatedAt != null) {
        return <FormattedRelativePreferenceDate value={updatedAt} />;
      }
      return getEmptyTagValue();
    },
  },
  {
    field: 'state',
    name: i18n.STATE,
    sortable: true,
    render: (state: Case['state']) => renderStringField(state),
  },
];
