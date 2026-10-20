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
import { EuiBadgeGroup, EuiBadge, EuiToolTip, RIGHT_ALIGNMENT } from '@elastic/eui';
import { Status } from '@kbn/cases-components/src/status/status';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';

import type { ActionConnector } from '../../../common/types/domain';

import type {
  CaseUI,
  SimilarCaseUI,
  CasesConfigurationUICustomField,
} from '../../../common/ui/types';
import type { CasesColumnSelection } from '../all_cases/types';
import { getEmptyCellValue } from '../empty_value';
import { CaseDetailsLink } from '../links';
import { TruncatedText } from '../truncated_text';
import { SeverityHealth } from '../severity/config';
import { AssigneesColumn } from '../all_cases/components/assignees_column';
import { ExternalServiceColumn } from '../all_cases/hooks/use_cases_columns';
import { tableColumnPresetDateRelative } from '../../utils/table_column_presets';
import { useCasesColumnsConfiguration } from '../all_cases/hooks/use_cases_columns_configuration';
import { useGlobalInlineFields } from '../all_cases/hooks/use_global_inline_fields';
import { getFieldColumns } from '../all_cases/utils/get_field_columns';
import { useCasesConfig } from '../../common/lib/kibana';
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

// Stable empty map: used when the caller passes no user profiles.
const EMPTY_PROFILES: Map<string, UserProfileWithAvatar> = new Map();

// Stable empty list: used when the caller passes no custom fields.
const NO_CUSTOM_FIELDS: CasesConfigurationUICustomField[] = [];

// Stable empty list: used when the caller passes no connectors.
const NO_CONNECTORS: ActionConnector[] = [];

export interface UseSimilarCasesColumnsReturnValue {
  columns: SimilarCasesColumns[];
  rowHeader: string;
}

export const useSimilarCasesColumns = ({
  selectedColumns,
  customFields = NO_CUSTOM_FIELDS,
  userProfiles = EMPTY_PROFILES,
  connectors = NO_CONNECTORS,
}: {
  selectedColumns: CasesColumnSelection[];
  customFields?: CasesConfigurationUICustomField[];
  userProfiles?: Map<string, UserProfileWithAvatar>;
  connectors?: ActionConnector[];
}): UseSimilarCasesColumnsReturnValue => {
  const casesColumnsConfig = useCasesColumnsConfiguration(false);
  const { templatesEnabled } = useCasesConfig();
  const { globalInlineFields } = useGlobalInlineFields({ enabled: templatesEnabled });

  const columnsDict: Record<string, SimilarCasesColumns> = useMemo(
    () => ({
      title: {
        field: casesColumnsConfig.title.field,
        name: casesColumnsConfig.title.name,
        sortable: true,
        render: (_title: string, theCase: SimilarCaseUI) => {
          if (theCase.id != null && theCase.title != null) {
            return (
              <CaseDetailsLink detailName={theCase.id} title={theCase.title}>
                <TruncatedText text={theCase.title} />
              </CaseDetailsLink>
            );
          }
          return getEmptyCellValue();
        },
        minWidth: '12em',
      },
      assignees: {
        field: casesColumnsConfig.assignees.field,
        name: casesColumnsConfig.assignees.name,
        sortable: false,
        render: (assignees: CaseUI['assignees']) => (
          <AssigneesColumn assignees={assignees} userProfiles={userProfiles} />
        ),
      },
      tags: {
        field: casesColumnsConfig.tags.field,
        name: casesColumnsConfig.tags.name,
        sortable: false,
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
        width: '14em',
      },
      totalAlerts: {
        field: casesColumnsConfig.totalAlerts.field,
        name: casesColumnsConfig.totalAlerts.name,
        sortable: false,
        align: RIGHT_ALIGNMENT,
        render: (totalAlerts: CaseUI['totalAlerts']) =>
          totalAlerts != null ? (
            <span data-test-subj="similar-cases-table-column-alertsCount">{totalAlerts}</span>
          ) : (
            getEmptyCellValue()
          ),
      },
      totalEvents: {
        field: casesColumnsConfig.totalEvents.field,
        name: casesColumnsConfig.totalEvents.name,
        sortable: false,
        align: RIGHT_ALIGNMENT,
        render: (totalEvents: CaseUI['totalEvents']) =>
          totalEvents != null ? (
            <span data-test-subj="similar-cases-table-column-eventsCount">{totalEvents}</span>
          ) : (
            getEmptyCellValue()
          ),
      },
      totalComment: {
        field: casesColumnsConfig.totalComment.field,
        name: casesColumnsConfig.totalComment.name,
        sortable: false,
        align: RIGHT_ALIGNMENT,
        render: (totalComment: CaseUI['totalComment']) =>
          totalComment != null ? (
            <span data-test-subj="similar-cases-table-column-commentCount">{totalComment}</span>
          ) : (
            getEmptyCellValue()
          ),
      },
      category: {
        field: casesColumnsConfig.category.field,
        name: casesColumnsConfig.category.name,
        sortable: true,
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
      closedAt: {
        ...tableColumnPresetDateRelative({ stripMs: false }),
        field: casesColumnsConfig.closedAt.field,
        name: casesColumnsConfig.closedAt.name,
        sortable: true,
        'data-test-subj': 'similar-cases-table-column-closedAt',
      },
      createdAt: {
        ...tableColumnPresetDateRelative({ stripMs: true }),
        field: casesColumnsConfig.createdAt.field,
        name: casesColumnsConfig.createdAt.name,
        sortable: true,
        'data-test-subj': 'similar-cases-table-column-createdAt',
      },
      updatedAt: {
        ...tableColumnPresetDateRelative({ stripMs: true }),
        field: casesColumnsConfig.updatedAt.field,
        name: casesColumnsConfig.updatedAt.name,
        sortable: true,
        'data-test-subj': 'similar-cases-table-column-updatedAt',
      },
      externalIncident: {
        width: '8.5em',
        name: casesColumnsConfig.externalIncident.name,
        render: (theCase: SimilarCaseUI) => {
          if (theCase.id != null) {
            return <ExternalServiceColumn theCase={theCase} connectors={connectors} />;
          }
          return getEmptyCellValue();
        },
      },
      status: {
        field: casesColumnsConfig.status.field,
        name: casesColumnsConfig.status.name,
        sortable: true,
        render: (status: CaseUI['status']) => {
          if (status != null) {
            return <Status status={status} />;
          }
          return getEmptyCellValue();
        },
        width: '110px',
      },
      severity: {
        field: casesColumnsConfig.severity.field,
        name: casesColumnsConfig.severity.name,
        sortable: true,
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
        minWidth: '6em',
      },
    }),
    [casesColumnsConfig, connectors, userProfiles]
  );

  const allColumnsDict = useMemo(
    (): Record<string, SimilarCasesColumns> => ({
      ...columnsDict,
      ...getFieldColumns<SimilarCaseUI>({
        templatesEnabled,
        globalInlineFields,
        customFields,
        userProfiles,
      }),
    }),
    [columnsDict, customFields, templatesEnabled, globalInlineFields, userProfiles]
  );

  const similarityReasonColumn: SimilarCasesColumns = useMemo(
    () => ({
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
      minWidth: '14em',
    }),
    []
  );

  const columns: SimilarCasesColumns[] = useMemo(() => {
    const result: SimilarCasesColumns[] = [];
    selectedColumns.forEach(({ field, isChecked }) => {
      if (isChecked && field in allColumnsDict) {
        result.push(allColumnsDict[field]);
      }
    });
    result.push(similarityReasonColumn);
    return result;
  }, [selectedColumns, allColumnsDict, similarityReasonColumn]);

  return { columns, rowHeader: casesColumnsConfig.title.field };
};
