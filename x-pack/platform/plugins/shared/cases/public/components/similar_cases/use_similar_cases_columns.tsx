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
import { EuiBadgeGroup, EuiBadge, EuiHealth, EuiToolTip } from '@elastic/eui';
import { Status } from '@kbn/cases-components/src/status/status';

import { CaseSeverity } from '../../../common/types/domain';
import type { CaseUI, SimilarCaseUI } from '../../../common/ui/types';
import { getEmptyCellValue } from '../empty_value';
import { CaseDetailsLink } from '../links';
import { TruncatedText } from '../truncated_text';
import { severities } from '../severity/config';
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
        render: (title: string, theCase: SimilarCaseUI) => {
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
            const severityData = severities[severity ?? CaseSeverity.LOW];
            return (
              <EuiHealth
                data-test-subj={`similar-cases-table-column-severity-${severity}`}
                color={severityData.color}
              >
                {severityData.label}
              </EuiHealth>
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
        render: (similarities: SimilarCaseUI['similarities'], theCase: SimilarCaseUI) => {
          if (theCase.id != null && theCase.title != null) {
            return similarities.observables.map((similarity) => similarity.value).join(', ');
          }
          return getEmptyCellValue();
        },
        width: '20%',
      },
    ],
    [casesColumnsConfig]
  );

  return { columns, rowHeader: casesColumnsConfig.title.field };
};
