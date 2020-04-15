/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';
import {
  EuiBadge,
  EuiTableFieldDataColumnType,
  EuiTableComputedColumnType,
  EuiTableActionsColumnType,
  EuiAvatar,
  EuiLink,
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

const renderStringField = (field: string, dataTestSubj: string) =>
  field != null ? <span data-test-subj={dataTestSubj}>{field}</span> : getEmptyTagValue();

export const getCasesColumns = (
  actions: Array<DefaultItemIconButtonAction<Case>>,
  filterStatus: string
): CasesColumns[] => [
  {
    name: i18n.NAME,
    render: (theCase: Case) => {
      if (theCase.id != null && theCase.title != null) {
        const caseDetailsLinkComponent = (
          <CaseDetailsLink detailName={theCase.id} title={theCase.title}>
            {theCase.title}
          </CaseDetailsLink>
        );
        return theCase.status === 'open' ? (
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
              name={createdBy.fullName ? createdBy.fullName : createdBy.username ?? ''}
              size="s"
            />
            <Spacer data-test-subj="case-table-column-createdBy">
              {createdBy.fullName ? createdBy.fullName : createdBy.username ?? ''}
            </Spacer>
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
    field: 'totalComment',
    name: i18n.COMMENTS,
    sortable: true,
    render: (totalComment: Case['totalComment']) =>
      totalComment != null
        ? renderStringField(`${totalComment}`, `case-table-column-commentCount`)
        : getEmptyTagValue(),
  },
  filterStatus === 'open'
    ? {
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
      }
    : {
        field: 'closedAt',
        name: i18n.CLOSED_ON,
        sortable: true,
        render: (closedAt: Case['closedAt']) => {
          if (closedAt != null) {
            return (
              <FormattedRelativePreferenceDate
                value={closedAt}
                data-test-subj={`case-table-column-closedAt`}
              />
            );
          }
          return getEmptyTagValue();
        },
      },
  {
    name: i18n.SERVICENOW_INCIDENT,
    render: (theCase: Case) => {
      if (theCase.id != null) {
        return <ServiceNowColumn theCase={theCase} />;
      }
      return getEmptyTagValue();
    },
  },
  {
    name: i18n.ACTIONS,
    actions,
  },
];

interface Props {
  theCase: Case;
}

export const ServiceNowColumn: React.FC<Props> = ({ theCase }) => {
  const handleRenderDataToPush = useCallback(() => {
    const lastCaseUpdate = theCase.updatedAt != null ? new Date(theCase.updatedAt) : null;
    const lastCasePush =
      theCase.externalService?.pushedAt != null
        ? new Date(theCase.externalService?.pushedAt)
        : null;
    const hasDataToPush =
      lastCasePush === null ||
      (lastCasePush != null &&
        lastCaseUpdate != null &&
        lastCasePush.getTime() < lastCaseUpdate?.getTime());
    return (
      <p>
        <EuiLink
          data-test-subj={`case-table-column-external`}
          href={theCase.externalService?.externalUrl}
          target="_blank"
          aria-label={i18n.SERVICENOW_LINK_ARIA}
        >
          {theCase.externalService?.externalTitle}
        </EuiLink>
        {hasDataToPush
          ? renderStringField(i18n.REQUIRES_UPDATE, `case-table-column-external-requiresUpdate`)
          : renderStringField(i18n.UP_TO_DATE, `case-table-column-external-upToDate`)}
      </p>
    );
  }, [theCase]);
  if (theCase.externalService !== null) {
    return handleRenderDataToPush();
  }
  return renderStringField(i18n.NOT_PUSHED, `case-table-column-external-notPushed`);
};
