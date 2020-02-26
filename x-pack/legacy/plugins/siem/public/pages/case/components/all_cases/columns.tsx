/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiBadge,
  EuiTableFieldDataColumnType,
  EuiTableComputedColumnType,
  EuiAvatar,
} from '@elastic/eui';
import styled from 'styled-components';
import { getEmptyTagValue } from '../../../../components/empty_value';
import { Case } from '../../../../containers/case/types';
import { FormattedRelativePreferenceDate } from '../../../../components/formatted_date';
import { CaseDetailsLink } from '../../../../components/links';
import { TruncatableText } from '../../../../components/truncatable_text';
import * as i18n from './translations';

export type CasesColumns = EuiTableFieldDataColumnType<Case> | EuiTableComputedColumnType<Case>;

const Spacer = styled.span`
  margin-left: 8px;
`;

export const getCasesColumns = (): CasesColumns[] => [
  {
    name: i18n.CASE_TITLE,
    render: (theCase: Case) => {
      if (theCase.caseId != null && theCase.title != null) {
        return <CaseDetailsLink detailName={theCase.caseId}>{theCase.title}</CaseDetailsLink>;
      }
      return getEmptyTagValue();
    },
  },
  {
    field: 'createdBy',
    name: i18n.REPORTER,
    render: (createdBy: Case['createdBy']) =>
      createdBy != null ? (
        <>
          <EuiAvatar
            className="userAction__circle"
            name={createdBy.fullName ? createdBy.fullName : createdBy.username}
            size="s"
          />
          <Spacer>{createdBy.username}</Spacer>
        </>
      ) : (
        getEmptyTagValue()
      ),
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
    align: 'right',
    field: 'updatedAt', // TO DO once we have commentCount returned in the API: https://github.com/elastic/kibana/issues/58525
    name: i18n.COMMENTS,
    sortable: true,
    render: () => {
      return <span>{1}</span>;
    },
  },
  {
    field: 'createdAt',
    name: i18n.OPENED_ON,
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
];
