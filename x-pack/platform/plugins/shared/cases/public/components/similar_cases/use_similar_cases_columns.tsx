/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type {
  EuiTableActionsColumnType,
  EuiTableComputedColumnType,
  EuiTableFieldDataColumnType,
} from '@elastic/eui';
import { EuiBadgeGroup, EuiBadge, EuiToolTip } from '@elastic/eui';
import { Status } from '@kbn/cases-components/src/status/status';

import type { CaseUI, SimilarCaseUI } from '../../../common/ui/types';
import { getEmptyCellValue } from '../empty_value';
import { CaseDetailsLink } from '../links';
import { TruncatedText } from '../truncated_text';
import { SeverityHealth } from '../severity/config';
import { useCasesColumnsConfiguration } from '../all_cases/use_cases_columns_configuration';
import * as i18n from './translations';

type SimilarCasesColumns =
  | EuiTableActionsColumnType<SimilarCaseUI>
  | EuiTableComputedColumnType<SimilarCaseUI>
  | EuiTableFieldDataColumnType<SimilarCaseUI>;

const LINE_CLAMP = 3;
const getLineClampedCss = css`
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: ${LINE_CLAMP};
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: normal;
`;

const SIMILARITIES_FIELD = 'similarities' as const;

export interface UseSimilarCasesColumnsReturnValue {
  columns: SimilarCasesColumns[];
  rowHeader: string;
}

export const useSimilarCasesColumns = (): UseSimilarCasesColumnsReturnValue => {
  const casesColumnsConfig = useCasesColumnsConfiguration(false);

  const columns: SimilarCasesColumns[] = useMemo(
    () => [
      {
        field: casesColumnsConfig.title.field,
        name: casesColumnsConfig.title.name,
        sortable: false,
        render: (_title: string, theCase: SimilarCaseUI) => {
          if (theCase.id != null && theCase.title != null) {
            const caseDetailsLinkComponent = (
              <CaseDetailsLink detailName={theCase.id} title={theCase.title}>
                <TruncatedText text={theCase.title} />
              </CaseDetailsLink>
            );

            return caseDetailsLinkComponent;
          }
          return getEmptyCellValue();
        },
        width: '20%',
      },
      {
        field: casesColumnsConfig.tags.field,
        name: casesColumnsConfig.tags.name,
        render: (tags: CaseUI['tags']) => {
          if (tags != null && tags.length > 0) {
            const clampedBadges = (
              <EuiBadgeGroup
                data-test-subj="similar-cases-table-column-tags"
                css={getLineClampedCss}
                gutterSize="xs"
              >
                {tags.map((tag: string, i: number) => (
                  <EuiBadge
                    css={css`
                      max-width: 100px;
                    `}
                    color="hollow"
                    key={`${tag}-${i}`}
                    data-test-subj={`similar-cases-table-column-tags-${tag}`}
                  >
                    {tag}
                  </EuiBadge>
                ))}
              </EuiBadgeGroup>
            );

            const unclampedBadges = (
              <EuiBadgeGroup data-test-subj="similar-cases-table-column-tags">
                {tags.map((tag: string, i: number) => (
                  <EuiBadge
                    color="hollow"
                    key={`${tag}-${i}`}
                    data-test-subj={`similar-cases-table-column-tags-${tag}`}
                  >
                    {tag}
                  </EuiBadge>
                ))}
              </EuiBadgeGroup>
            );

            return (
              <EuiToolTip
                data-test-subj="similar-cases-table-column-tags-tooltip"
                position="left"
                content={unclampedBadges}
              >
                {clampedBadges}
              </EuiToolTip>
            );
          }
          return getEmptyCellValue();
        },
        width: '12%',
      },
      {
        field: casesColumnsConfig.category.field,
        name: casesColumnsConfig.category.name,
        sortable: false,
        render: (category: CaseUI['category']) => {
          if (category != null) {
            return (
              <span data-test-subj={`similar-cases-table-column-category-${category}`}>
                {category}
              </span>
            );
          }
          return getEmptyCellValue();
        },
        width: '120px',
      },
      {
        field: casesColumnsConfig.status.field,
        name: casesColumnsConfig.status.name,
        sortable: false,
        render: (status: CaseUI['status']) => {
          if (status != null) {
            return <Status status={status} />;
          }

          return getEmptyCellValue();
        },
        width: '110px',
      },
      {
        field: casesColumnsConfig.severity.field,
        name: casesColumnsConfig.severity.name,
        sortable: false,
        render: (severity: CaseUI['severity']) => {
          if (severity != null) {
            return (
              <SeverityHealth
                data-test-subj={`similar-cases-table-column-severity-${severity}`}
                severity={severity}
              />
            );
          }
          return getEmptyCellValue();
        },
        width: '90px',
      },
      {
        field: SIMILARITIES_FIELD,
        name: i18n.SIMILARITY_REASON,
        sortable: false,
        render: (similarities: SimilarCaseUI['similarities']) => {
          const similarObservableValues = similarities.observables.map(
            (similarity) => `${similarity.typeLabel}:${similarity.value}`
          );

          if (similarObservableValues.length > 0) {
            const clampedBadges = (
              <EuiBadgeGroup
                data-test-subj="similar-cases-table-column-similarities"
                css={getLineClampedCss}
                gutterSize="xs"
              >
                {similarObservableValues.map((similarValue: string) => (
                  <EuiBadge
                    css={css`
                      max-width: 100px;
                    `}
                    color="hollow"
                    key={`${similarValue}`}
                    data-test-subj={`similar-cases-table-column-similarities-${similarValue}`}
                  >
                    {similarValue}
                  </EuiBadge>
                ))}
              </EuiBadgeGroup>
            );

            const unclampedBadges = (
              <EuiBadgeGroup data-test-subj="similar-cases-table-column-similarities">
                {similarObservableValues.map((similarValue: string) => (
                  <EuiBadge
                    color="hollow"
                    key={`${similarValue}`}
                    data-test-subj={`similar-cases-table-column-similarities-${similarValue}`}
                  >
                    {similarValue}
                  </EuiBadge>
                ))}
              </EuiBadgeGroup>
            );

            return (
              <EuiToolTip
                data-test-subj="similar-cases-table-column-similarities-tooltip"
                position="left"
                content={unclampedBadges}
              >
                {clampedBadges}
              </EuiToolTip>
            );
          }
          return getEmptyCellValue();
        },
        width: '20%',
      },
    ],
    [
      casesColumnsConfig.category.field,
      casesColumnsConfig.category.name,
      casesColumnsConfig.severity.field,
      casesColumnsConfig.severity.name,
      casesColumnsConfig.status.field,
      casesColumnsConfig.status.name,
      casesColumnsConfig.tags.field,
      casesColumnsConfig.tags.name,
      casesColumnsConfig.title.field,
      casesColumnsConfig.title.name,
    ]
  );

  return { columns, rowHeader: casesColumnsConfig.title.field };
};
