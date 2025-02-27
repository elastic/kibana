/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBasicTable,
  EuiButton,
  EuiComboBox,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageTemplate,
  EuiPanel,
  EuiCallOut,
  EuiRange,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  UseEuiTheme,
  euiTextTruncate,
  logicalCSS,
} from '@elastic/eui';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { Timeseries } from './timeseries';
import { useGetOverview } from '../../hooks/use_get_overview';
import { Result, RunErrors, TaskTypeData, formatData } from './helpers/format_data';

const wrapperStyle = css`
  &:hover .rhythmChart__zoom {
    visibility: visible;
  }
`;

const summaryStatusNoWrapStatStyle = css`
  p {
    ${euiTextTruncate()}
  }
`;

const summaryStatusNoWrapStyle = ({ euiTheme }: UseEuiTheme) => css`
  ${logicalCSS('margin-left', euiTheme.size.m)}
  ${logicalCSS('margin-right', euiTheme.size.m)}
`;

export const TaskManagerPage = React.memo(() => {
  const { data, refetch } = useGetOverview();
  // @ts-ignore
  const [formattedData, setFormattedData] = React.useState<Result>({});
  const [nodeIds, setNodeIds] = React.useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<Array<{ label: string }> | undefined>(undefined);
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (data) {
      const ids = data.byNode.map((node) => node.serverUuid);
      setNodeIds(ids);
      setFormattedData(formatData(data));
    }
  }, [data]);

  useEffect(() => {
    if (data) {
      setFormattedData(formatData(data, selectedNodeId));
    }
  }, [selectedNodeId, data]);

  useBreadcrumbs('taskManager');

  const refreshData = useCallback(() => refetch(), [refetch]);

  const onSelectNodeChange = (selected: Array<{ label: string }>) => {
    setSelectedNodeId(selected.length > 0 ? selected[0].label : undefined);
    setSelectedNode(selected);
  };

  const getLevels = (value: number) => {
    return [
      {
        min: 0,
        max: value,
        color: 'success',
      },
      {
        min: value,
        max: 100,
        color: 'danger',
      },
    ];
  };
  return (
    <>
      <EuiPageTemplate
        offset={0}
        restrictWidth={false}
        grow={false}
        data-test-subj="tmAppContainer"
      >
        <EuiPageTemplate.Section>
          {/* Header */}
          <EuiPageHeader
            pageTitle="Task Manager overview"
            rightSideItems={[
              <EuiButton onClick={refreshData} iconType="refresh" color="primary" fill>
                Refresh
              </EuiButton>,
            ]}
          />
          <EuiSpacer size="m" />
          <EuiPage paddingSize="m">
            <EuiPageBody>
              <div>
                <EuiPage>
                  <EuiPageBody>
                    {/* Summary */}
                    <EuiPanel>
                      <div css={summaryStatusNoWrapStyle}>
                        <EuiFlexGroup
                          gutterSize="m"
                          alignItems="center"
                          justifyContent="spaceBetween"
                        >
                          <EuiFlexItem style={{ maxWidth: 200 }} key="summary-nodes" grow={false}>
                            <EuiStat
                              title={formattedData?.numBackgroundNodes}
                              titleSize="xxxs"
                              textAlign="left"
                              css={summaryStatusNoWrapStatStyle}
                              description="Nodes"
                            />
                          </EuiFlexItem>
                          <EuiFlexItem style={{ maxWidth: 200 }} key="summary-nodes" grow={false}>
                            <EuiStat
                              title={formattedData?.numTasks}
                              titleSize="xxxs"
                              textAlign="left"
                              css={summaryStatusNoWrapStatStyle}
                              description="Tasks"
                            />
                          </EuiFlexItem>
                          <EuiFlexItem style={{ maxWidth: 200 }} key="summary-nodes" grow={false}>
                            <EuiStat
                              title={formattedData?.numRecurringTasks}
                              titleSize="xxxs"
                              textAlign="left"
                              css={summaryStatusNoWrapStatStyle}
                              description="Recurring Tasks"
                            />
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </div>
                    </EuiPanel>
                    <EuiSpacer size="m" />

                    {/* Node Selector */}
                    {nodeIds.length > 0 && (
                      <EuiComboBox
                        placeholder="Filter by node"
                        singleSelection={{ asPlainText: true }}
                        options={nodeIds.map((id) => ({ label: id }))}
                        selectedOptions={selectedNode}
                        onChange={onSelectNodeChange}
                      />
                    )}
                    <EuiSpacer size="m" />

                    {/* Claim and Run Metrics */}
                    <EuiPanel>
                      <EuiFlexGrid columns={2} gutterSize="s">
                        <EuiFlexItem key="1">
                          <EuiFlexGroup direction="column" gutterSize="s" css={wrapperStyle}>
                            <EuiFlexItem grow={false}>
                              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                                <EuiFlexItem grow={false}>
                                  <EuiFlexGroup gutterSize="s" alignItems="center">
                                    <EuiFlexItem grow={false}>
                                      <EuiTitle size="s">
                                        <h2>Claim duration (ms)</h2>
                                      </EuiTitle>
                                    </EuiFlexItem>
                                  </EuiFlexGroup>
                                </EuiFlexItem>
                              </EuiFlexGroup>
                            </EuiFlexItem>
                            <EuiFlexItem style={{ minHeight: '200px' }}>
                              <Timeseries series={formattedData?.claimDurationMetric ?? []} />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                          <EuiSpacer />
                        </EuiFlexItem>

                        <EuiFlexItem key="2">
                          <EuiFlexGroup direction="column" gutterSize="s" css={wrapperStyle}>
                            <EuiFlexItem grow={false}>
                              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                                <EuiFlexItem grow={false}>
                                  <EuiFlexGroup gutterSize="s" alignItems="center">
                                    <EuiFlexItem grow={false}>
                                      <EuiTitle size="s">
                                        <h2>Load (%)</h2>
                                      </EuiTitle>
                                    </EuiFlexItem>
                                  </EuiFlexGroup>
                                </EuiFlexItem>
                              </EuiFlexGroup>
                            </EuiFlexItem>
                            <EuiFlexItem style={{ minHeight: '200px' }}>
                              <Timeseries series={formattedData?.loadMetric ?? []} />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                          <EuiSpacer />
                        </EuiFlexItem>

                        <EuiFlexItem key="3">
                          <EuiFlexGroup direction="column" gutterSize="s" css={wrapperStyle}>
                            <EuiFlexItem grow={false}>
                              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                                <EuiFlexItem grow={false}>
                                  <EuiFlexGroup gutterSize="s" alignItems="center">
                                    <EuiFlexItem grow={false}>
                                      <EuiTitle size="s">
                                        <h2>Run duration (ms)</h2>
                                      </EuiTitle>
                                    </EuiFlexItem>
                                  </EuiFlexGroup>
                                </EuiFlexItem>
                              </EuiFlexGroup>
                            </EuiFlexItem>
                            <EuiFlexItem style={{ minHeight: '200px' }}>
                              <Timeseries series={formattedData?.runDurationMetric ?? []} />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                          <EuiSpacer />
                        </EuiFlexItem>

                        <EuiFlexItem key="4">
                          <EuiFlexGroup direction="column" gutterSize="s" css={wrapperStyle}>
                            <EuiFlexItem grow={false}>
                              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                                <EuiFlexItem grow={false}>
                                  <EuiFlexGroup gutterSize="s" alignItems="center">
                                    <EuiFlexItem grow={false}>
                                      <EuiTitle size="s">
                                        <h2>Schedule delay (ms)</h2>
                                      </EuiTitle>
                                    </EuiFlexItem>
                                  </EuiFlexGroup>
                                </EuiFlexItem>
                              </EuiFlexGroup>
                            </EuiFlexItem>
                            <EuiFlexItem style={{ minHeight: '200px' }}>
                              <Timeseries series={formattedData?.scheduleDelayMetric ?? []} />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                          <EuiSpacer />
                        </EuiFlexItem>
                      </EuiFlexGrid>
                    </EuiPanel>
                    <EuiSpacer size="m" />

                    {/* Task types */}
                    <EuiPanel>
                      <EuiFlexGrid gutterSize="s">
                        <EuiFlexItem key="1">
                          <EuiFlexGroup direction="column" gutterSize="s" css={wrapperStyle}>
                            <EuiFlexItem grow={false}>
                              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                                <EuiFlexItem grow={false}>
                                  <EuiFlexGroup gutterSize="s" alignItems="center">
                                    <EuiFlexItem grow={false}>
                                      <EuiTitle size="s">
                                        <h2>Task types</h2>
                                      </EuiTitle>
                                    </EuiFlexItem>
                                  </EuiFlexGroup>
                                </EuiFlexItem>
                              </EuiFlexGroup>
                            </EuiFlexItem>
                            <EuiFlexItem style={{ minHeight: '200px' }}>
                              <EuiBasicTable
                                items={formattedData.taskTypeSuccess ?? []}
                                columns={[
                                  {
                                    field: 'type',
                                    sortable: false,
                                    name: 'Task type',
                                    width: '80%',
                                  },
                                  {
                                    name: 'Run success',
                                    render: (item: TaskTypeData) => {
                                      if (!item) return null;
                                      const successValue = Math.ceil(
                                        (item.success * 100) / item.total
                                      );
                                      return (
                                        <EuiFlexGroup
                                          alignItems="center"
                                          justifyContent="flexStart"
                                        >
                                          <EuiFlexItem style={{ maxWidth: '40px' }}>
                                            <EuiText size="s">
                                              <p>
                                                {successValue}
                                                {'%'}
                                              </p>
                                            </EuiText>
                                          </EuiFlexItem>
                                          <EuiFlexItem style={{ maxWidth: '100px' }}>
                                            <EuiRange
                                              min={0}
                                              max={100}
                                              value={successValue}
                                              levels={getLevels(successValue)}
                                            />
                                          </EuiFlexItem>
                                        </EuiFlexGroup>
                                      );
                                    },
                                  },
                                ]}
                              />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                          <EuiSpacer />
                        </EuiFlexItem>
                      </EuiFlexGrid>
                    </EuiPanel>
                    <EuiSpacer size="m" />

                    {/* Errors */}
                    <EuiPanel>
                      <EuiFlexGrid gutterSize="s">
                        <EuiFlexItem key="1">
                          <EuiFlexGroup direction="column" gutterSize="s" css={wrapperStyle}>
                            <EuiFlexItem grow={false}>
                              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                                <EuiFlexItem grow={false}>
                                  <EuiFlexGroup gutterSize="s" alignItems="center">
                                    <EuiFlexItem grow={false}>
                                      <EuiTitle size="s">
                                        <h2>Recent errors</h2>
                                      </EuiTitle>
                                    </EuiFlexItem>
                                  </EuiFlexGroup>
                                </EuiFlexItem>
                              </EuiFlexGroup>
                            </EuiFlexItem>
                            {formattedData?.taskRunErrors?.length > 0 ? (
                              <EuiFlexItem style={{ minHeight: '100px' }}>
                                <EuiBasicTable
                                  items={formattedData.taskRunErrors ?? []}
                                  columns={[
                                    {
                                      field: 'message',
                                      sortable: false,
                                      name: 'Log message',
                                      width: '70%',
                                    },
                                    {
                                      render: (item: RunErrors) => {
                                        if (!item) return null;
                                        const numAffectedTasks = item.byTaskType.reduce(
                                          (acc, task) => acc + task.count,
                                          0
                                        );
                                        return (
                                          <EuiFlexGroup
                                            alignItems="center"
                                            justifyContent="flexStart"
                                          >
                                            <EuiFlexItem style={{ maxWidth: '300px' }}>
                                              <EuiText size="s">
                                                <p>
                                                  {numAffectedTasks}
                                                  {' task runs across '}
                                                  {item.byTaskType.length}
                                                  {' task types'}
                                                </p>
                                              </EuiText>
                                            </EuiFlexItem>
                                          </EuiFlexGroup>
                                        );
                                      },
                                    },
                                  ]}
                                />
                              </EuiFlexItem>
                            ) : (
                              <EuiFlexItem style={{ minHeight: '80px' }}>
                                <EuiCallOut title="No recent errors!" color="success">
                                  <p>There have been no task run errors in the last 15 minutes</p>
                                </EuiCallOut>
                              </EuiFlexItem>
                            )}
                          </EuiFlexGroup>
                          <EuiSpacer />
                        </EuiFlexItem>
                      </EuiFlexGrid>
                    </EuiPanel>
                  </EuiPageBody>
                </EuiPage>
              </div>
            </EuiPageBody>
          </EuiPage>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  );
});

TaskManagerPage.displayName = 'TaskManagerPage';
// eslint-disable-next-line import/no-default-export
export { TaskManagerPage as default };
