/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import type {
  AllocatedModel,
  NodeDeploymentStatsResponse,
} from '../../../../common/types/trained_models';
import { useFieldFormatter } from '../../contexts/kibana/use_field_formatter';
import { useEnabledFeatures } from '../../contexts/ml';

interface AllocatedModelsProps {
  models: NodeDeploymentStatsResponse['allocated_models'];
  hideColumns?: string[];
}

export const AllocatedModels: FC<AllocatedModelsProps> = ({
  models,
  hideColumns = ['node_name'],
}) => {
  const bytesFormatter = useFieldFormatter(FIELD_FORMAT_IDS.BYTES);
  const dateFormatter = useFieldFormatter(FIELD_FORMAT_IDS.DATE);
  const durationFormatter = useFieldFormatter(FIELD_FORMAT_IDS.DURATION);
  const euiTheme = useEuiTheme();
  const { showNodeInfo } = useEnabledFeatures();

  const columns: Array<EuiBasicTableColumn<AllocatedModel>> = [
    {
      width: '10%',
      id: 'deployment_id',
      field: 'deployment_id',
      name: i18n.translate('xpack.ml.trainedModels.nodesList.modelsList.deploymentIdHeader', {
        defaultMessage: 'ID',
      }),
      sortable: true,
      truncateText: false,
      isExpander: false,
      'data-test-subj': 'mlAllocatedModelsTableDeploymentId',
    },
    {
      width: '8%',
      name: i18n.translate('xpack.ml.trainedModels.nodesList.modelsList.modelRoutingStateHeader', {
        defaultMessage: 'State',
      }),
      'data-test-subj': 'mlAllocatedModelsTableRoutingState',
      render: (v: AllocatedModel) => {
        const { routing_state: routingState, reason } = v.node.routing_state;

        const isFailed = routingState === 'failed';

        return (
          <EuiToolTip content={reason ? reason : ''}>
            <EuiBadge color={isFailed ? 'danger' : 'hollow'}>{routingState}</EuiBadge>
          </EuiToolTip>
        );
      },
    },
    {
      width: '8%',
      id: 'node_name',
      field: 'node.name',
      name: i18n.translate('xpack.ml.trainedModels.nodesList.modelsList.nodeNameHeader', {
        defaultMessage: 'Node name',
      }),
      sortable: true,
      truncateText: false,
      'data-test-subj': 'mlAllocatedModelsTableNodeName',
    },
    {
      width: '10%',
      id: 'model_id',
      field: 'model_id',
      name: i18n.translate('xpack.ml.trainedModels.nodesList.modelsList.modelNameHeader', {
        defaultMessage: 'Name',
      }),
      sortable: true,
      truncateText: false,
      'data-test-subj': 'mlAllocatedModelsTableName',
    },
    {
      width: '8%',
      name: i18n.translate('xpack.ml.trainedModels.nodesList.modelsList.modelSizeHeader', {
        defaultMessage: 'Size',
      }),
      truncateText: true,
      'data-test-subj': 'mlAllocatedModelsTableSize',
      render: (v: AllocatedModel) => {
        return bytesFormatter(v.required_native_memory_bytes);
      },
    },
    {
      width: '8%',
      name: (
        <EuiToolTip
          content={
            showNodeInfo
              ? i18n.translate(
                  'xpack.ml.trainedModels.nodesList.modelsList.allocationTooltipNodes',
                  {
                    defaultMessage:
                      'Number of allocations per node multiplied by number of threads per allocation',
                  }
                )
              : i18n.translate('xpack.ml.trainedModels.nodesList.modelsList.allocationTooltip', {
                  defaultMessage:
                    'Number of allocations multiplied by number of threads per allocation',
                })
          }
        >
          <span>
            {i18n.translate('xpack.ml.trainedModels.nodesList.modelsList.allocationHeader', {
              defaultMessage: 'Allocation',
            })}
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </span>
        </EuiToolTip>
      ),
      truncateText: false,
      'data-test-subj': 'mlAllocatedModelsTableAllocation',
      render: (v: AllocatedModel) => {
        if (
          v.node.number_of_allocations === undefined ||
          v.node.threads_per_allocation === undefined
        ) {
          return '-';
        }

        let adaptiveAllocations = null;
        if (v.adaptive_allocations?.enabled) {
          adaptiveAllocations = (
            <EuiToolTip
              content={i18n.translate(
                'xpack.ml.trainedModels.nodesList.modelsList.adaptiveAllocationsTooltip',
                {
                  defaultMessage: 'Adaptive allocations enabled',
                }
              )}
            >
              <EuiIcon size="l" color="warning" type="scale" />
            </EuiToolTip>
          );
        }
        return (
          <>
            <>
              {v.node.number_of_allocations} * {v.node.threads_per_allocation}
            </>
            {adaptiveAllocations}
          </>
        );
      },
    },
    {
      width: '8%',
      name: (
        <EuiToolTip
          content={i18n.translate(
            'xpack.ml.trainedModels.nodesList.modelsList.throughputLastMinuteTooltip',
            {
              defaultMessage: 'The number of requests processed in the last 1 minute.',
            }
          )}
        >
          <span>
            {i18n.translate(
              'xpack.ml.trainedModels.nodesList.modelsList.throughputLastMinuteHeader',
              {
                defaultMessage: 'Throughput',
              }
            )}
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </span>
        </EuiToolTip>
      ),
      field: 'node.throughput_last_minute',
      truncateText: false,
      'data-test-subj': 'mlAllocatedModelsTableThroughput',
    },
    {
      width: '8%',
      name: (
        <EuiToolTip
          display={'block'}
          title={
            <FormattedMessage
              id="xpack.ml.trainedModels.nodesList.modelsList.modelAvgInferenceTimeTooltipHeader"
              defaultMessage="Average inference time"
            />
          }
          content={
            <FormattedMessage
              id="xpack.ml.trainedModels.nodesList.modelsList.modelAvgInferenceTimeTooltipMessage"
              defaultMessage="If caching is enabled, fast cache hits are included when calculating the average inference time."
            />
          }
        >
          <EuiFlexGroup gutterSize={'xs'}>
            <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
              <span css={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <FormattedMessage
                  id="xpack.ml.trainedModels.nodesList.modelsList.modelAvgInferenceTimeHeader"
                  defaultMessage="Avg inference time"
                />
              </span>
            </EuiFlexItem>
            <EuiFlexItem grow={false} css={{ minWidth: euiTheme.euiTheme.size.m }}>
              <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiToolTip>
      ),
      truncateText: false,
      'data-test-subj': 'mlAllocatedModelsTableAvgInferenceTime',
      render: (v: AllocatedModel) => {
        return v.node.average_inference_time_ms
          ? durationFormatter(v.node.average_inference_time_ms)
          : '-';
      },
    },
    {
      width: '8%',
      name: i18n.translate(
        'xpack.ml.trainedModels.nodesList.modelsList.modelInferenceCountHeader',
        {
          defaultMessage: 'Inference count',
        }
      ),
      'data-test-subj': 'mlAllocatedModelsTableInferenceCount',
      render: (v: AllocatedModel) => {
        return v.node.inference_count;
      },
    },
    {
      width: '12%',
      name: i18n.translate('xpack.ml.trainedModels.nodesList.modelsList.modelStartTimeHeader', {
        defaultMessage: 'Start time',
      }),
      'data-test-subj': 'mlAllocatedModelsTableStartedTime',
      render: (v: AllocatedModel) => {
        return v.node.start_time ? dateFormatter(v.node.start_time) : '-';
      },
    },
    {
      width: '12%',
      name: i18n.translate('xpack.ml.trainedModels.nodesList.modelsList.modelLastAccessHeader', {
        defaultMessage: 'Last access',
      }),
      'data-test-subj': 'mlAllocatedModelsTableInferenceCount',
      render: (v: AllocatedModel) => {
        return v.node.last_access ? dateFormatter(v.node.last_access) : '-';
      },
    },
    {
      width: '8%',
      name: i18n.translate(
        'xpack.ml.trainedModels.nodesList.modelsList.modelNumberOfPendingRequestsHeader',
        {
          defaultMessage: 'Pending requests',
        }
      ),
      'data-test-subj': 'mlAllocatedModelsTableNumberOfPendingRequests',
      render: (v: AllocatedModel) => {
        return v.node.number_of_pending_requests;
      },
    },
    {
      width: '8%',
      name: i18n.translate('xpack.ml.trainedModels.nodesList.modelsList.errorCountHeader', {
        defaultMessage: 'Errors',
      }),
      'data-test-subj': 'mlAllocatedModelsTableErrorCount',
      render: (v: AllocatedModel) => {
        return v.node.error_count ?? 0;
      },
    },
  ].filter((v) => !hideColumns.includes(v.id!));

  return (
    <EuiInMemoryTable<AllocatedModel>
      responsiveBreakpoint={'xl'}
      allowNeutralSort={false}
      columns={columns}
      items={models}
      itemId={'key'}
      rowProps={(item) => ({
        'data-test-subj': `mlAllocatedModelTableRow row-${item.model_id}`,
      })}
      onTableChange={() => {}}
      data-test-subj={'mlNodesAllocatedModels'}
    />
  );
};
