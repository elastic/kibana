/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  EuiTableActionsColumnType,
  EuiTableComputedColumnType,
  EuiTableFieldDataColumnType,
} from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiScreenReaderOnly,
  EuiText,
  EuiToolTip,
  RIGHT_ALIGNMENT,
  EuiLoadingSpinner,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';

import { PROJECT_ROUTING, useIsCpsMultiProject } from '@kbn/cps-utils';
import type { TransformId } from '../../../../../../common/types/transform';
import { isLatestTransform, isPivotTransform } from '../../../../../../common/types/transform';
import {
  mapEsHealthStatus2TransformHealthStatus,
  TRANSFORM_MODE,
  TRANSFORM_STATE,
} from '../../../../../../common/constants';

import type { TransformListRow } from '../../../../common';
import { getTransformProgress, TRANSFORM_LIST_COLUMN } from '../../../../common';
import { useActions } from './use_actions';
import { isManagedTransform } from '../../../../common/managed_transforms_utils';
import { useAppDependencies } from '../../../../app_dependencies';

import { TransformHealthColoredDot } from './transform_health_colored_dot';
import { getProjectScopeSortValue, ProjectScopeColumn } from './project_scope_column';

const TRUNCATE_TEXT_LINES = 3;

type TransformListColumn =
  | EuiTableComputedColumnType<TransformListRow>
  | EuiTableFieldDataColumnType<TransformListRow>
  | EuiTableActionsColumnType<TransformListRow>;

const StatsUnknown = () => (
  <EuiText textAlign="center" color="subdued" size="s">
    <FormattedMessage id="xpack.transform.transformList.statsUnknown" defaultMessage="Unknown" />
  </EuiText>
);

const TransformIdWithDescription = ({ item }: { item: TransformListRow }) => {
  const transformId = item.config.id;
  const description = item.config.description;
  const transformIdContent = !isManagedTransform(item) ? (
    <EuiToolTip content={transformId}>
      <span tabIndex={0} data-test-subj="transformListColumnIdText">
        {transformId}
      </span>
    </EuiToolTip>
  ) : (
    <>
      <EuiToolTip
        content={`${transformId} (${i18n.translate(
          'xpack.transform.transformList.managedBadgeLabel',
          {
            defaultMessage: 'Managed',
          }
        )})`}
      >
        <span tabIndex={0} data-test-subj="transformListColumnIdText">
          {transformId}
        </span>
      </EuiToolTip>
      &nbsp;
      <EuiToolTip
        content={i18n.translate('xpack.transform.transformList.managedBadgeTooltip', {
          defaultMessage:
            'This transform is preconfigured and managed by Elastic; other parts of the product might have might have dependencies on its behavior.',
        })}
      >
        <EuiBadge tabIndex={0} color="hollow" data-test-subj="transformListRowIsManagedBadge">
          {i18n.translate('xpack.transform.transformList.managedBadgeLabel', {
            defaultMessage: 'Managed',
          })}
        </EuiBadge>
      </EuiToolTip>
    </>
  );

  return (
    <>
      <div>{transformIdContent}</div>
      {description ? (
        <>
          <EuiSpacer size="xs" />
          <EuiToolTip content={description}>
            <EuiText tabIndex={0} color="subdued" size="s">
              <span data-test-subj="transformListColumnDescriptionText">{description}</span>
            </EuiText>
          </EuiToolTip>
        </>
      ) : null}
    </>
  );
};

export const useColumns = (
  expandedRowItemIds: TransformId[],
  setExpandedRowItemIds: React.Dispatch<React.SetStateAction<TransformId[]>>,
  transformNodes: number,
  transformSelection: TransformListRow[],
  transformsStatsLoading: boolean
) => {
  const NoStatsFallbackComponent = transformsStatsLoading ? EuiLoadingSpinner : StatsUnknown;
  const { euiTheme } = useEuiTheme();
  const { cps } = useAppDependencies();
  const cpsManager = cps?.cpsManager;
  const hasLinkedProjects = useIsCpsMultiProject(cpsManager);
  const [originProjectId, setOriginProjectId] = React.useState<string | undefined>();

  React.useEffect(() => {
    let isMounted = true;
    setOriginProjectId(undefined);

    if (cpsManager && hasLinkedProjects) {
      cpsManager
        .fetchProjects(PROJECT_ROUTING.ORIGIN)
        .then((projects) => {
          if (isMounted) {
            setOriginProjectId(projects?.origin?._id);
          }
        })
        .catch(() => {
          if (isMounted) {
            setOriginProjectId(undefined);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [cpsManager, hasLinkedProjects]);

  const { actions, modals } = useActions({
    forceDisable: transformSelection.length > 0,
    transformNodes,
  });

  function toggleDetails(item: TransformListRow) {
    const index = expandedRowItemIds.indexOf(item.config.id);
    if (index !== -1) {
      expandedRowItemIds.splice(index, 1);
      setExpandedRowItemIds([...expandedRowItemIds]);
    } else {
      expandedRowItemIds.push(item.config.id);
    }

    // spread to a new array otherwise the component wouldn't re-render
    setExpandedRowItemIds([...expandedRowItemIds]);
  }

  const columns: TransformListColumn[] = [
    {
      field: TRANSFORM_LIST_COLUMN.ID,
      'data-test-subj': 'transformListColumnId',
      name: 'ID',
      sortable: true,
      truncateText: { lines: TRUNCATE_TEXT_LINES },
      scope: 'row',
      render: (_transformId, item) => <TransformIdWithDescription item={item} />,
    },
    ...(cpsManager && hasLinkedProjects
      ? [
          {
            name: i18n.translate('xpack.transform.projectScope', {
              defaultMessage: 'Project scope',
            }),
            'data-test-subj': 'transformListColumnProjectScope',
            sortable: (item: TransformListRow) =>
              getProjectScopeSortValue(item.config.source.project_routing, originProjectId),
            truncateText: true,
            render(item: TransformListRow) {
              return (
                <ProjectScopeColumn
                  cpsManager={cpsManager}
                  projectRouting={item.config.source.project_routing}
                />
              );
            },
            width: '160px',
          } satisfies EuiTableComputedColumnType<TransformListRow>,
        ]
      : []),
    {
      name: i18n.translate('xpack.transform.health', { defaultMessage: 'Health' }),
      'data-test-subj': 'transformListColumnHealth',
      sortable: (item: TransformListRow) => item.stats?.health?.status,
      truncateText: true,
      render(item: TransformListRow) {
        return item.stats?.health ? (
          <TransformHealthColoredDot
            healthStatus={mapEsHealthStatus2TransformHealthStatus(item.stats.health.status)}
          />
        ) : (
          <NoStatsFallbackComponent />
        );
      },
      width: '110px',
    },
    {
      name: i18n.translate('xpack.transform.type', { defaultMessage: 'Type' }),
      'data-test-subj': 'transformListColumnType',
      sortable: (item: TransformListRow) =>
        isPivotTransform(item.config) ? 'pivot' : isLatestTransform(item.config) ? 'latest' : '',
      truncateText: true,
      render(item: TransformListRow) {
        let transformType = i18n.translate('xpack.transform.type.unknown', {
          defaultMessage: 'Unknown',
        });
        if (isPivotTransform(item.config) === true) {
          transformType = i18n.translate('xpack.transform.type.pivot', { defaultMessage: 'Pivot' });
        }
        if (isLatestTransform(item.config) === true) {
          transformType = i18n.translate('xpack.transform.type.latest', {
            defaultMessage: 'Latest',
          });
        }
        return transformType;
      },
      width: '100px',
    },
    {
      name: i18n.translate('xpack.transform.status', { defaultMessage: 'Status' }),
      'data-test-subj': 'transformListColumnStatus',
      sortable: (item: TransformListRow) => item.stats?.state,
      truncateText: true,
      render(item: TransformListRow) {
        if (!item.stats) {
          return <NoStatsFallbackComponent />;
        }

        const status = `${item.stats.state.charAt(0).toUpperCase()}${item.stats.state.slice(1)}`;
        return item.stats.state === TRANSFORM_STATE.FAILED && item.stats.reason ? (
          <EuiToolTip content={item.stats.reason}>
            <span tabIndex={0}>{status}</span>
          </EuiToolTip>
        ) : (
          status
        );
      },
      width: '100px',
    },
    {
      name: i18n.translate('xpack.transform.execution', { defaultMessage: 'Execution' }),
      'data-test-subj': 'transformListColumnExecution',
      sortable: (item: TransformListRow) => item.mode,
      truncateText: true,
      render(item: TransformListRow) {
        if (item.mode === TRANSFORM_MODE.CONTINUOUS) {
          return i18n.translate('xpack.transform.execution.continuous', {
            defaultMessage: 'Continuous',
          });
        }

        const progress = getTransformProgress(item);
        return progress === undefined ? null : (
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">{`${progress}%`}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiProgress
                value={progress}
                max={100}
                color={euiTheme.colors.mediumShade}
                size="m"
                data-test-subj="transformListProgress"
              >
                {progress}%
              </EuiProgress>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
      width: '170px',
    },
    {
      name: (
        <EuiScreenReaderOnly>
          <p>{i18n.translate('xpack.transform.tableActionLabel', { defaultMessage: 'Actions' })}</p>
        </EuiScreenReaderOnly>
      ),
      actions: actions as EuiTableActionsColumnType<TransformListRow>['actions'],
      width: '40px',
    },
    {
      name: (
        <EuiScreenReaderOnly>
          <p>
            <FormattedMessage
              id="xpack.transform.transformList.showDetailsColumn.screenReaderDescription"
              defaultMessage="This column contains clickable controls for showing more details on each transform"
            />
          </p>
        </EuiScreenReaderOnly>
      ),
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      render: (item: TransformListRow) => {
        const isExpanded = expandedRowItemIds.includes(item.config.id);
        const label = isExpanded
          ? i18n.translate('xpack.transform.transformList.rowCollapse', {
              defaultMessage: 'Hide details for {transformId}',
              values: { transformId: item.config.id },
            })
          : i18n.translate('xpack.transform.transformList.rowExpand', {
              defaultMessage: 'Show details for {transformId}',
              values: { transformId: item.config.id },
            });

        return (
          <EuiToolTip content={label} disableScreenReaderOutput>
            <EuiButtonIcon
              onClick={() => toggleDetails(item)}
              aria-label={label}
              iconType={isExpanded ? 'chevronSingleUp' : 'chevronSingleDown'}
              data-test-subj="transformListRowDetailsToggle"
            />
          </EuiToolTip>
        );
      },
    },
  ];

  return { columns, modals };
};
