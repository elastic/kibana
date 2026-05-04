/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FlowNode } from '@kbn/streams-plugin/common';
import { formatRate } from '../edges/throughput_edge';

type CloudPipelineNode = Extract<FlowNode, { kind: 'cloudPipeline' }>;

interface PanelCloudPipelineProps {
  node: CloudPipelineNode;
  onClose: () => void;
}

export const PanelCloudPipeline: React.FC<PanelCloudPipelineProps> = ({ node, onClose }) => {
  const listItems = [
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelCloudPipeline.pipelineId', {
        defaultMessage: 'Pipeline ID',
      }),
      description: node.pipelineId,
    },
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelCloudPipeline.targetStream', {
        defaultMessage: 'Target stream',
      }),
      description: node.targetStreamName ?? '—',
    },
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelCloudPipeline.healthStatus', {
        defaultMessage: 'Health',
      }),
      description: node.health?.status ?? 'unknown',
    },
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelCloudPipeline.throughput', {
        defaultMessage: 'Throughput',
      }),
      description: node.throughput ? formatRate(node.throughput.docsPerSec) : '—',
    },
  ];

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {node.label}{' '}
            <EuiBadge color="warning">
              {i18n.translate('xpack.streams.ingestFlow.panelCloudPipeline.mockBadge', {
                defaultMessage: 'MOCK',
              })}
            </EuiBadge>
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiDescriptionList listItems={listItems} type="column" columnWidths={[1, 2]} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              color="danger"
              iconType="trash"
              onClick={() => {
                // TODO: open CloudPipelineEditFlyout in delete mode (workstream F)
                onClose();
              }}
            >
              {i18n.translate('xpack.streams.ingestFlow.panelCloudPipeline.deleteButton', {
                defaultMessage: 'Delete',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="copy"
              onClick={() => {
                // TODO: open CloudPipelineEditFlyout in duplicate mode (workstream F)
              }}
            >
              {i18n.translate('xpack.streams.ingestFlow.panelCloudPipeline.duplicateButton', {
                defaultMessage: 'Duplicate',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="pencil"
              onClick={() => {
                // TODO: open CloudPipelineEditFlyout in edit mode (workstream F)
              }}
            >
              {i18n.translate('xpack.streams.ingestFlow.panelCloudPipeline.editButton', {
                defaultMessage: 'Edit',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
