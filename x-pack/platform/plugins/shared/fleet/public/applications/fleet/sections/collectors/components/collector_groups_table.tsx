/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import type { CriteriaWithPagination } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { AGENT_TYPE_OPAMP } from '../../../../../../common/constants';
import type { Agent, CollectorGroup } from '../../../../../../common/types';
import { useGetAgentsQuery } from '../../../../../hooks/use_request/agents';

import { CollectorsTable } from './collectors_table';

import { getSignalBadgeColor } from './signal_colors';

const DEFAULT_EXPANDED_PAGE_SIZE = 10;

const ExpandedGroupCollectors: React.FC<{ group: CollectorGroup }> = ({ group }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_EXPANDED_PAGE_SIZE);

  const kuery = useMemo(() => {
    const escapedGroup = group.group.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const groupFilter = group.isUngrouped
      ? `NOT non_identifying_attributes.elastic.collector.group:*`
      : `non_identifying_attributes.elastic.collector.group:"${escapedGroup}"`;
    return `type:${AGENT_TYPE_OPAMP} AND ${groupFilter}`;
  }, [group.group, group.isUngrouped]);

  const { data, isLoading } = useGetAgentsQuery(
    { kuery, page: pageIndex + 1, perPage: pageSize, showInactive: false },
    { enabled: true }
  );

  const collectors = data?.data?.items ?? [];
  const totalCount = data?.data?.total ?? 0;

  const onTableChange = useCallback((criteria: CriteriaWithPagination<Agent>) => {
    setPageIndex(criteria.page.index);
    setPageSize(criteria.page.size);
  }, []);

  return (
    <CollectorsTable
      collectors={collectors}
      isLoading={isLoading}
      totalCount={totalCount}
      pageIndex={pageIndex}
      pageSize={pageSize}
      onTableChange={onTableChange}
    />
  );
};

interface CollectorGroupsTableProps {
  groups: CollectorGroup[];
  groupBy: string;
  expandedGroups: string[];
  onToggleGroup: (groupKey: string) => void;
  isLoading: boolean;
  pageIndex: number;
  hasNextPage: boolean;
  onNextPage: () => void;
  onPreviousPage: () => void;
}

const CollectorGroupRow: React.FC<{
  group: CollectorGroup;
  groupBy: string;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ group, groupBy, isExpanded, onToggle }) => {
  const { euiTheme } = useEuiTheme();
  const displayName = group.isUngrouped
    ? i18n.translate('xpack.fleet.collectorGroups.othersGroupDisplayName', {
        defaultMessage: 'Others',
      })
    : group.groupDisplayName;

  return (
    <>
      <EuiPanel hasBorder paddingSize="m" data-test-subj={`fleetCollectorGroup-${group.group}`}>
        <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false}>
          <EuiFlexItem grow>
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.translate('xpack.fleet.collectorGroups.expandRow', {
                    defaultMessage: 'Expand {group}',
                    values: { group: displayName },
                  })}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
                    aria-label={i18n.translate('xpack.fleet.collectorGroups.expandRow', {
                      defaultMessage: 'Expand {group}',
                      values: { group: displayName },
                    })}
                    onClick={onToggle}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow>
                <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <strong>{displayName}</strong>
                    </EuiText>
                  </EuiFlexItem>
                  {group.signals.length > 0 && (
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                        {group.signals.map((signal) => {
                          const [bgColor, textColor] = getSignalBadgeColor(
                            euiTheme.colors.vis,
                            signal
                          );
                          return (
                            <EuiFlexItem grow={false} key={signal}>
                              <EuiBadge
                                color={bgColor}
                                css={css`
                                  color: ${textColor};
                                `}
                              >
                                {signal}
                              </EuiBadge>
                            </EuiFlexItem>
                          );
                        })}
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <FormattedMessage
                        id="xpack.fleet.collectorGroups.collectorsLabel"
                        defaultMessage="Collectors"
                      />
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="subdued">{group.docCount}</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>

              <EuiFlexItem
                grow={false}
                css={{
                  width: 1,
                  alignSelf: 'stretch',
                  backgroundColor: euiTheme.colors.lightShade,
                }}
              />

              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <FormattedMessage
                        id="xpack.fleet.collectorGroups.alertsLabel"
                        defaultMessage="Alerts:"
                      />
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">-</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>

              <EuiFlexItem
                grow={false}
                css={{
                  width: 1,
                  alignSelf: 'stretch',
                  backgroundColor: euiTheme.colors.lightShade,
                }}
              />

              <EuiFlexItem grow={false}>
                <EuiButtonEmpty size="s" iconType="arrowDown" iconSide="right" isDisabled>
                  <FormattedMessage
                    id="xpack.fleet.collectorGroups.takeAction"
                    defaultMessage="Take action"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      {isExpanded && (
        <EuiPanel
          paddingSize="m"
          hasBorder
          css={css`
            border-top: none;
            margin-top: -1px;
          `}
        >
          {groupBy === 'collector.group' ? (
            <ExpandedGroupCollectors group={group} />
          ) : (
            'TODO: implement expanded content for config.name grouping'
          )}
        </EuiPanel>
      )}
    </>
  );
};

export const CollectorGroupsTable: React.FC<CollectorGroupsTableProps> = ({
  groups,
  groupBy,
  expandedGroups,
  onToggleGroup,
  isLoading,
  pageIndex,
  hasNextPage,
  onNextPage,
  onPreviousPage,
}) => {
  if (isLoading && groups.length === 0) {
    return (
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <div data-test-subj="fleetCollectorGroupsList">
      {groups.map((group) => (
        <React.Fragment key={group.group}>
          <CollectorGroupRow
            group={group}
            groupBy={groupBy}
            isExpanded={expandedGroups.includes(group.group)}
            onToggle={() => onToggleGroup(group.group)}
          />
          <EuiSpacer size="s" />
        </React.Fragment>
      ))}

      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="arrowLeft"
            onClick={onPreviousPage}
            isDisabled={pageIndex === 0}
            data-test-subj="fleetCollectorGroupsPrevPage"
          >
            <FormattedMessage
              id="xpack.fleet.collectorGroups.previousPage"
              defaultMessage="Previous"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="arrowRight"
            iconSide="right"
            onClick={onNextPage}
            isDisabled={!hasNextPage}
            data-test-subj="fleetCollectorGroupsNextPage"
          >
            <FormattedMessage id="xpack.fleet.collectorGroups.nextPage" defaultMessage="Next" />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
