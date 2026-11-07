/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import {
  type EuiBasicTableColumn,
  EuiBadgeGroup,
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiIcon,
  EuiToolTip,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { Status } from '@kbn/cases-components/src/status/status';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { VerdictBadge } from '../../verdict/verdict_badge';
import {
  PENDING_DECISIONS,
  PENDING_DECISIONS_SHORT,
  SOURCE_LABELS,
} from '../../../common/translations';
import { decisionsAvailability } from '../../../client/case_view_sections';
import { CaseAccessMode, CaseStatuses } from '../../../../common/types/domain';

import { tableColumnPresetDateRelative } from '../../../utils/table_column_presets';
import type { ActionConnector } from '../../../../common/types/domain';
import type { CaseUI } from '../../../../common/ui/types';
import type { CasesColumnSelection } from '../types';
import { getEmptyCellValue } from '../../empty_value';
import { CaseDetailsLink } from '../../links';
import * as i18n from '../translations';
import { useActions } from './use_actions';
import { useCasesColumnsConfiguration } from './use_cases_columns_configuration';
import { useApplicationCapabilities, useCasesConfig, useKibana } from '../../../common/lib/kibana';
import { getFieldColumns } from '../utils/get_field_columns';
import { useGlobalInlineFields } from './use_global_inline_fields';
import { TruncatedText } from '../../truncated_text';
import { getConnectorIcon } from '../../utils';
import { AssigneesColumn } from '../components/assignees_column';
import { useGetCaseConfiguration } from '../../../containers/configure/use_get_case_configuration';
import { IncrementalIdText } from '../../incremental_id';
import { severities } from '../../severity/config';
import { useCaseStatuses } from '../../status/use_case_statuses';
import { PausedStatusTooltip } from '../../status/paused_status_tooltip';

type CasesColumns = EuiBasicTableColumn<CaseUI>;

const LINE_CLAMP = 3;
const getLineClampedCss = css`
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: ${LINE_CLAMP};
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: normal;
`;

const renderStringField = (field: string, dataTestSubj: string) =>
  field != null ? <span data-test-subj={dataTestSubj}>{field}</span> : getEmptyCellValue();
export interface GetCasesColumn {
  filterStatus: string[];
  userProfiles: Map<string, UserProfileWithAvatar>;
  isSelectorView: boolean;
  selectedColumns: CasesColumnSelection[];
  connectors?: ActionConnector[];
  onRowClick?: (theCase: CaseUI) => void;
  disableActions?: boolean;
  disabledCases?: Set<string>;
  /** Linked investigations per case id, for the Investigations column (agentic cases). */
  linkedInvestigationCounts?: Record<string, number>;
}

export interface UseCasesColumnsReturnValue {
  columns: CasesColumns[];
  isLoadingColumns: boolean;
  rowHeader: string;
}

export const useCasesColumns = ({
  userProfiles,
  isSelectorView,
  connectors = [],
  onRowClick,
  disableActions = false,
  selectedColumns,
  disabledCases,
  linkedInvestigationCounts,
}: GetCasesColumn): UseCasesColumnsReturnValue => {
  const casesColumnsConfig = useCasesColumnsConfiguration(isSelectorView);
  const { actions } = useActions({ disableActions });
  const { templatesEnabled, agenticEnabled } = useCasesConfig();
  const showPendingDecisions = agenticEnabled && decisionsAvailability.isEnabled();
  const { getStatus } = useCaseStatuses();

  const {
    data: { customFields },
    isFetching: isLoadingConfiguration,
  } = useGetCaseConfiguration({ keepPreviousData: true });

  const { globalInlineFields, isLoading: isLoadingGlobalFields } = useGlobalInlineFields({
    enabled: templatesEnabled,
  });

  const isLoadingColumns = isLoadingConfiguration || isLoadingGlobalFields;

  const assignCaseAction = useCallback(
    async (theCase: CaseUI) => {
      if (onRowClick) {
        onRowClick(theCase);
      }
    },
    [onRowClick]
  );

  const columnsDict: Record<string, CasesColumns> = useMemo(
    () => ({
      title: {
        field: casesColumnsConfig.title.field,
        name: casesColumnsConfig.title.name,
        sortable: true,
        minWidth: '12em',
        render: (_: string, theCase: CaseUI) => {
          if (theCase.id == null || theCase.title == null) {
            return getEmptyCellValue();
          }

          if (isSelectorView) {
            return theCase.title;
          }

          return (
            <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false} wrap={false}>
              {typeof theCase.incrementalId === 'number' && (
                <EuiFlexItem grow={false}>
                  <IncrementalIdText incrementalId={theCase.incrementalId} />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <CaseDetailsLink detailName={theCase.id} title={theCase.title}>
                  <TruncatedText text={theCase.title} />
                </CaseDetailsLink>
              </EuiFlexItem>
              {theCase.access?.mode === CaseAccessMode.RESTRICTED && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={i18n.ACCESS_RESTRICTED}>
                    <EuiIcon
                      type="lock"
                      size="s"
                      aria-label={i18n.ACCESS_RESTRICTED}
                      data-test-subj={`case-table-column-restricted-${theCase.id}`}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              )}
              {showPendingDecisions && (theCase.pendingDecisions ?? 0) > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiBadge
                    color="warning"
                    title={PENDING_DECISIONS(theCase.pendingDecisions ?? 0)}
                    data-test-subj="case-table-pending-decisions"
                  >
                    {PENDING_DECISIONS_SHORT(theCase.pendingDecisions ?? 0)}
                  </EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          );
        },
      },
      assignees: {
        width: '6em',
        minWidth: '2em',
        field: casesColumnsConfig.assignees.field,
        name: casesColumnsConfig.assignees.name,
        render: (assignees: CaseUI['assignees']) => (
          <AssigneesColumn assignees={assignees} userProfiles={userProfiles} />
        ),
      },
      tags: {
        field: casesColumnsConfig.tags.field,
        name: casesColumnsConfig.tags.name,
        width: '14em',
        minWidth: '8em',
        render: (tags: CaseUI['tags']) => {
          if (tags != null && tags.length > 0) {
            const clampedBadges = (
              <EuiBadgeGroup
                data-test-subj="case-table-column-tags"
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
                    data-test-subj={`case-table-column-tags-${tag}`}
                  >
                    {tag}
                  </EuiBadge>
                ))}
              </EuiBadgeGroup>
            );

            const unclampedBadges = (
              <EuiBadgeGroup data-test-subj="case-table-column-tags">
                {tags.map((tag: string, i: number) => (
                  <EuiBadge
                    color="hollow"
                    key={`${tag}-${i}`}
                    data-test-subj={`case-table-column-tags-${tag}`}
                  >
                    {tag}
                  </EuiBadge>
                ))}
              </EuiBadgeGroup>
            );

            return (
              <EuiToolTip
                content={unclampedBadges}
                data-test-subj="case-table-column-tags-tooltip"
                position="left"
              >
                {clampedBadges}
              </EuiToolTip>
            );
          }
          return getEmptyCellValue();
        },
      },
      totalAlerts: {
        minWidth: '4em',
        width: '4em',
        field: casesColumnsConfig.totalAlerts.field,
        name: casesColumnsConfig.totalAlerts.name,
        align: RIGHT_ALIGNMENT,
        render: (totalAlerts: CaseUI['totalAlerts']) =>
          totalAlerts != null
            ? renderStringField(`${totalAlerts}`, `case-table-column-alertsCount`)
            : getEmptyCellValue(),
      },
      totalEvents: {
        minWidth: '4em',
        width: '4em',
        field: casesColumnsConfig.totalEvents.field,
        name: casesColumnsConfig.totalEvents.name,
        align: RIGHT_ALIGNMENT,
        render: (totalEvents: CaseUI['totalEvents']) =>
          totalEvents != null
            ? renderStringField(`${totalEvents}`, `case-table-column-eventsCount`)
            : getEmptyCellValue(),
      },
      totalComment: {
        minWidth: '6em',
        width: '6em',
        field: casesColumnsConfig.totalComment.field,
        name: casesColumnsConfig.totalComment.name,
        align: RIGHT_ALIGNMENT,
        render: (totalComment: CaseUI['totalComment']) =>
          totalComment != null
            ? renderStringField(`${totalComment}`, `case-table-column-commentCount`)
            : getEmptyCellValue(),
      },
      category: {
        minWidth: '6.5em',
        width: '10em',
        field: casesColumnsConfig.category.field,
        name: casesColumnsConfig.category.name,
        sortable: true,
        render: (category: CaseUI['category']) => {
          if (category != null) {
            return (
              <span data-test-subj={`case-table-column-category-${category}`}>{category}</span>
            );
          }
          return getEmptyCellValue();
        },
      },
      closedAt: {
        ...tableColumnPresetDateRelative({ stripMs: false }),
        field: casesColumnsConfig.closedAt.field,
        name: casesColumnsConfig.closedAt.name,
        sortable: true,
        'data-test-subj': 'case-table-column-closedAt',
      },
      createdAt: {
        ...tableColumnPresetDateRelative({ stripMs: true }),
        field: casesColumnsConfig.createdAt.field,
        name: casesColumnsConfig.createdAt.name,
        sortable: true,
        'data-test-subj': 'case-table-column-createdAt',
      },
      updatedAt: {
        ...tableColumnPresetDateRelative({ stripMs: true }),
        field: casesColumnsConfig.updatedAt.field,
        name: casesColumnsConfig.updatedAt.name,
        sortable: true,
        'data-test-subj': 'case-table-column-updatedAt',
      },
      externalIncident: {
        // no field
        width: '8.5em',
        name: casesColumnsConfig.externalIncident.name,
        render: (theCase: CaseUI) => {
          if (theCase.id != null) {
            return <ExternalServiceColumn theCase={theCase} connectors={connectors} />;
          }
          return getEmptyCellValue();
        },
      },
      status: {
        width: '6.5em',
        minWidth: '6.5em', // The longest status string is "In progress"
        className: 'eui-textNoWrap',
        field: casesColumnsConfig.status.field,
        name: casesColumnsConfig.status.name,
        sortable: true,
        render: (status: CaseUI['status'], theCase: CaseUI) => {
          if (status != null) {
            return (
              <PausedStatusTooltip pausedAt={theCase.pausedAt} pauseReason={theCase.pauseReason}>
                <Status status={status} label={getStatus(theCase.statusKey, status).label} />
              </PausedStatusTooltip>
            );
          }

          return getEmptyCellValue();
        },
      },
      severity: {
        width: '6em',
        minWidth: '6em',
        className: 'eui-textNoWrap',
        field: casesColumnsConfig.severity.field,
        name: casesColumnsConfig.severity.name,
        sortable: true,
        render: (severity: CaseUI['severity']) => {
          if (severity != null) {
            return (
              <EuiBadge
                color={severities[severity].badgeColor}
                data-test-subj={`case-severity-badge-${severity}`}
              >
                {severities[severity].label}
              </EuiBadge>
            );
          }

          return getEmptyCellValue();
        },
      },
      assignCaseAction: {
        // no field
        align: RIGHT_ALIGNMENT,
        render: (theCase: CaseUI) => {
          if (theCase.id != null) {
            const isAlreadyAttached = disabledCases?.has(theCase.id) ?? false;
            const isClosed = theCase.status === CaseStatuses.closed;
            const disabled = isAlreadyAttached || isClosed;
            const selectButton = (
              <EuiButton
                data-test-subj={`cases-table-row-select-${theCase.id}`}
                onClick={() => assignCaseAction(theCase)}
                size="s"
                iconType={isAlreadyAttached ? 'check' : undefined}
                disabled={disabled}
              >
                {isAlreadyAttached ? i18n.ALREADY_ATTACHED : i18n.SELECT}
              </EuiButton>
            );

            // Disabled buttons do not emit pointer events, so wrap in a span to
            // ensure the explanatory tooltip still shows on hover.
            if (isAlreadyAttached) {
              return (
                <EuiToolTip content={i18n.ALREADY_ATTACHED_TOOLTIP}>
                  <span
                    tabIndex={0}
                    data-test-subj={`cases-table-row-select-tooltip-${theCase.id}`}
                  >
                    {selectButton}
                  </span>
                </EuiToolTip>
              );
            }

            return selectButton;
          }
          return getEmptyCellValue();
        },
        width: '8em',
      },
    }),
    [
      assignCaseAction,
      casesColumnsConfig,
      connectors,
      isSelectorView,
      userProfiles,
      disabledCases,
      getStatus,
      showPendingDecisions,
    ]
  );

  const agenticColumnsDict = useMemo(() => {
    const dict: Record<string, CasesColumns> = {};
    if (!casesColumnsConfig.source || !casesColumnsConfig.aiVerdict) {
      return dict;
    }
    dict.source = {
      field: casesColumnsConfig.source.field,
      name: casesColumnsConfig.source.name,
      width: '10em',
      render: (source: CaseUI['source']) => (
        // The table squeezes columns below their width when many are shown, and "AlertZero"
        // then breaks mid-word.
        <span
          className="eui-textNoWrap"
          data-test-subj={`case-table-column-source-${source ?? 'user'}`}
        >
          {SOURCE_LABELS[source ?? 'user']}
        </span>
      ),
    };
    dict.aiVerdict = {
      field: casesColumnsConfig.aiVerdict.field,
      name: casesColumnsConfig.aiVerdict.name,
      width: '10em',
      render: (aiVerdict: CaseUI['aiVerdict']) =>
        aiVerdict != null ? (
          <VerdictBadge
            verdict={aiVerdict.verdict}
            confidence={aiVerdict.confidence}
            data-test-subj="case-table-column-ai-verdict"
          />
        ) : (
          getEmptyCellValue()
        ),
    };
    if (casesColumnsConfig.linkedInvestigations) {
      dict.linkedInvestigations = {
        field: casesColumnsConfig.linkedInvestigations.field,
        name: casesColumnsConfig.linkedInvestigations.name,
        width: '9em',
        render: (_: unknown, theCase: CaseUI) => {
          const count = linkedInvestigationCounts?.[theCase.id] ?? 0;
          return count > 0 ? (
            <span data-test-subj={`case-table-column-investigations-${theCase.id}`}>{count}</span>
          ) : (
            getEmptyCellValue()
          );
        },
      };
    }
    return dict;
  }, [casesColumnsConfig, linkedInvestigationCounts]);

  const allColumnsDict = useMemo(
    () => ({
      ...columnsDict,
      ...agenticColumnsDict,
      ...getFieldColumns<CaseUI>({
        templatesEnabled,
        globalInlineFields,
        customFields,
        userProfiles,
      }),
    }),
    [
      columnsDict,
      agenticColumnsDict,
      customFields,
      templatesEnabled,
      globalInlineFields,
      userProfiles,
    ]
  );

  const columns: CasesColumns[] = [];

  selectedColumns.forEach(({ field, isChecked }) => {
    if (
      field in allColumnsDict &&
      (isChecked || isSelectorView) &&
      casesColumnsConfig[field].canDisplay
    ) {
      columns.push(allColumnsDict[field]);
    }
  });

  if (isSelectorView) {
    columns.push(allColumnsDict.assignCaseAction);
  } else if (actions) {
    columns.push(actions);
  }

  return { columns, isLoadingColumns, rowHeader: casesColumnsConfig.title.field };
};

interface Props {
  theCase: Pick<CaseUI, 'externalService' | 'updatedAt'>;
  connectors: ActionConnector[];
}

const iconWrapperCss = css`
  svg {
    height: 20px !important;
    position: relative;
    top: 3px;
    width: 20px !important;
  }
`;

export const ExternalServiceColumn: React.FC<Props> = ({ theCase, connectors }) => {
  const { triggersActionsUi } = useKibana().services;
  const { actions } = useApplicationCapabilities();

  if (theCase.externalService == null) {
    return renderStringField(i18n.NOT_PUSHED, `case-table-column-external-notPushed`);
  }

  const lastPushedConnector: ActionConnector | undefined = connectors.find(
    (connector) => connector.id === theCase.externalService?.connectorId
  );
  const lastCaseUpdate = theCase.updatedAt != null ? new Date(theCase.updatedAt) : null;
  const lastCasePush =
    theCase.externalService?.pushedAt != null ? new Date(theCase.externalService?.pushedAt) : null;
  const hasDataToPush =
    lastCasePush === null ||
    (lastCaseUpdate != null && lastCasePush.getTime() < lastCaseUpdate?.getTime());

  return (
    <p>
      {actions.read && (
        <span css={iconWrapperCss}>
          <EuiIcon
            size="original"
            title={theCase.externalService?.connectorName}
            type={getConnectorIcon(triggersActionsUi, lastPushedConnector?.actionTypeId)}
            data-test-subj="cases-table-connector-icon"
          />
        </span>
      )}
      <EuiLink
        data-test-subj={`case-table-column-external`}
        title={theCase.externalService?.connectorName}
        href={theCase.externalService?.externalUrl}
        target="_blank"
        aria-label={i18n.PUSH_LINK_ARIA(theCase.externalService?.connectorName)}
      >
        {theCase.externalService?.externalTitle}
      </EuiLink>
      {hasDataToPush
        ? renderStringField(i18n.REQUIRES_UPDATE, `case-table-column-external-requiresUpdate`)
        : renderStringField(i18n.UP_TO_DATE, `case-table-column-external-upToDate`)}
    </p>
  );
};
ExternalServiceColumn.displayName = 'ExternalServiceColumn';
