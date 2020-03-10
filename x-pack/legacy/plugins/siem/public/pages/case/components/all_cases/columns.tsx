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
  EuiTableActionsColumnType,
  EuiAvatar,
} from '@elastic/eui';
import styled from 'styled-components';
import { DefaultItemIconButtonAction } from '@elastic/eui/src/components/basic_table/action_types';
import { getEmptyTagValue } from '../../../../components/empty_value';
import { Case } from '../../../../containers/case/types';
import { FormattedRelativePreferenceDate } from '../../../../components/formatted_date';
import { CaseDetailsLink } from '../../../../components/links';
import { TruncatableText } from '../../../../components/truncatable_text';
import * as i18n from './translations';

export type CasesColumns =
  | EuiTableFieldDataColumnType<Case>
  | EuiTableComputedColumnType<Case>
  | EuiTableActionsColumnType<Case>;

const MediumShadeText = styled.p`
  color: ${({ theme }) => theme.eui.euiColorMediumShade};
`;

const Spacer = styled.span`
  margin-left: ${({ theme }) => theme.eui.paddingSizes.s};
`;

const TempNumberComponent = () => <span>{1}</span>;
TempNumberComponent.displayName = 'TempNumberComponent';

export const getCasesColumns = (
  actions: Array<DefaultItemIconButtonAction<Case>>
): CasesColumns[] => [
  {
    name: i18n.NAME,
    render: (theCase: Case) => {
      if (theCase.id != null && theCase.title != null) {
        const caseDetailsLinkComponent = (
          <CaseDetailsLink detailName={theCase.id}>{theCase.title}</CaseDetailsLink>
        );
        return theCase.state === 'open' ? (
          caseDetailsLinkComponent
        ) : (
          <>
            <MediumShadeText>
              {caseDetailsLinkComponent}
              <Spacer>{i18n.CLOSED}</Spacer>
            </MediumShadeText>
          </>
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    field: 'createdBy',
    name: i18n.REPORTER,
    render: (createdBy: Case['createdBy']) => {
      if (createdBy != null) {
        return (
          <>
            <EuiAvatar
              className="userAction__circle"
              name={createdBy.fullName ? createdBy.fullName : createdBy.username}
              size="s"
            />
            <Spacer data-test-subj="case-table-column-createdBy">{createdBy.username}</Spacer>
          </>
        );
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
    align: 'right',
    field: 'commentCount', // TO DO once we have commentCount returned in the API: https://github.com/elastic/kibana/issues/58525
    name: i18n.COMMENTS,
    sortable: true,
    render: TempNumberComponent,
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
  {
    name: 'Actions',
    actions,
  },
];
