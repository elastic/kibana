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

const renderStringField = (field: string, dataTestSubj: string) =>
  field != null ? <span data-test-subj={dataTestSubj}>{field}</span> : getEmptyTagValue();

export const getCasesColumns = (): CasesColumns[] => [
  {
    name: i18n.NAME,
    render: (theCase: Case) => {
      if (theCase.caseId != null && theCase.title != null) {
        return <CaseDetailsLink detailName={theCase.caseId}>{theCase.title}</CaseDetailsLink>;
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
              <EuiBadge
                color="hollow"
                key={`${tag}-${i}`}
                data-test-subj={`case-table-column-tags-${i}`}
              >
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
    field: 'createdAt',
    name: i18n.CREATED_AT,
    sortable: true,
    render: (createdAt: Case['createdAt']) => {
      if (createdAt != null) {
        return (
          <FormattedRelativePreferenceDate
            value={createdAt}
            data-test-subj={`case-table-column-createdAt`}
          />
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    field: 'createdBy.username',
    name: i18n.REPORTER,
    render: (createdBy: Case['createdBy']['username']) =>
      renderStringField(createdBy, `case-table-column-username`),
  },
  {
    field: 'updatedAt',
    name: i18n.LAST_UPDATED,
    sortable: true,
    render: (updatedAt: Case['updatedAt']) => {
      if (updatedAt != null) {
        return (
          <FormattedRelativePreferenceDate
            value={updatedAt}
            data-test-subj={`case-table-column-updatedAt`}
          />
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    field: 'state',
    name: i18n.STATE,
    sortable: true,
    render: (state: Case['state']) => renderStringField(state, `case-table-column-state`),
  },
];
