/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { type Edge, type Node, type NodeMouseHandler, type NodeTypes } from '@xyflow/react';
import { CanvasShell } from './canvas_shell';

type MockCanvasNodeType = 'source' | 'pipeline' | 'route' | 'destination';

interface MockCanvasNodeData extends Record<string, unknown> {
  label: string;
  type: MockCanvasNodeType;
  description: string;
  status: string;
}

type MockCanvasNode = Node<MockCanvasNodeData>;
type MockCanvasEdge = Edge;

// The mock canvas renders default React Flow nodes, so it opts out of the
// shared node registry.
const MOCK_NODE_TYPES: NodeTypes = {};

const nodeTypeLabels: Record<MockCanvasNodeType, string> = {
  source: i18n.translate('xpack.streams.canvas.nodeType.source', {
    defaultMessage: 'Source',
  }),
  pipeline: i18n.translate('xpack.streams.canvas.nodeType.pipeline', {
    defaultMessage: 'Pipeline',
  }),
  route: i18n.translate('xpack.streams.canvas.nodeType.route', {
    defaultMessage: 'Route',
  }),
  destination: i18n.translate('xpack.streams.canvas.nodeType.destination', {
    defaultMessage: 'Destination',
  }),
};

/**
 * Mock canvas for wired (and any non-classic) streams. It renders a static
 * source -> pipeline -> route -> destination topology until these streams are
 * wired to real data.
 */
export function MockStreamCanvas({ streamName }: { streamName: string }) {
  const [selectedNode, setSelectedNode] = useState<MockCanvasNode | null>(null);

  const nodes = useMemo<MockCanvasNode[]>(
    () => [
      {
        id: 'source-default',
        position: { x: 0, y: 120 },
        ariaLabel: `${nodeTypeLabels.source}: Default source`,
        data: {
          label: 'Default source',
          type: 'source',
          description: i18n.translate('xpack.streams.canvas.mockSourceDescription', {
            defaultMessage: 'Managed input endpoint where data enters the topology.',
          }),
          status: i18n.translate('xpack.streams.canvas.mockStatus.live', {
            defaultMessage: 'Live',
          }),
        },
      },
      {
        id: 'pipeline-default',
        position: { x: 280, y: 120 },
        ariaLabel: `${nodeTypeLabels.pipeline}: Processing`,
        data: {
          label: 'Processing',
          type: 'pipeline',
          description: i18n.translate('xpack.streams.canvas.mockPipelineDescription', {
            defaultMessage:
              'Streamlang processing placement for this stream. This will house what used to be the Processing tab.',
          }),
          status: i18n.translate('xpack.streams.canvas.mockStatus.mocked', {
            defaultMessage: 'Mocked',
          }),
        },
      },
      {
        id: 'route-default',
        position: { x: 560, y: 120 },
        ariaLabel: `${nodeTypeLabels.route}: Routing`,
        data: {
          label: 'Routing',
          type: 'route',
          description: i18n.translate('xpack.streams.canvas.mockRouteDescription', {
            defaultMessage:
              'Conditional path selection or fan-out rules. This will house what used to be the Partitioning tab.',
          }),
          status: i18n.translate('xpack.streams.canvas.mockStatus.mocked', {
            defaultMessage: 'Mocked',
          }),
        },
      },
      {
        id: 'destination-default',
        position: { x: 840, y: 120 },
        ariaLabel: `${nodeTypeLabels.destination}: ${streamName}`,
        data: {
          label: streamName,
          type: 'destination',
          description: i18n.translate('xpack.streams.canvas.mockDestinationDescription', {
            defaultMessage: 'Elasticsearch destination (v0) for indexed data.',
          }),
          status: i18n.translate('xpack.streams.canvas.mockStatus.active', {
            defaultMessage: 'Active',
          }),
        },
      },
    ],
    [streamName]
  );

  const edges = useMemo<MockCanvasEdge[]>(
    () => [
      { id: 'source-pipeline', source: 'source-default', target: 'pipeline-default' },
      { id: 'pipeline-route', source: 'pipeline-default', target: 'route-default' },
      { id: 'route-destination', source: 'route-default', target: 'destination-default' },
    ],
    []
  );

  const handleNodeClick = useCallback<NodeMouseHandler<MockCanvasNode>>((_event, node) => {
    setSelectedNode(node);
  }, []);

  return (
    <CanvasShell<MockCanvasNode>
      nodes={nodes}
      edges={edges}
      nodeTypes={MOCK_NODE_TYPES}
      onNodeClick={handleNodeClick}
      nodesDraggable={false}
      elementsSelectable
    >
      {selectedNode && (
        <EuiFlyout
          onClose={() => setSelectedNode(null)}
          size="s"
          data-test-subj="streamsCanvasNodeFlyout"
          aria-labelledby="streamsCanvasNodeFlyoutTitle"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem>
                <EuiTitle size="m">
                  <h2 id="streamsCanvasNodeFlyoutTitle">{selectedNode.data.label}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{nodeTypeLabels[selectedNode.data.type]}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiText size="s">
              <p>{selectedNode.data.description}</p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiDescriptionList
              type="column"
              listItems={[
                {
                  title: i18n.translate('xpack.streams.canvas.nodeFlyout.typeLabel', {
                    defaultMessage: 'Type',
                  }),
                  description: nodeTypeLabels[selectedNode.data.type],
                },
                {
                  title: i18n.translate('xpack.streams.canvas.nodeFlyout.statusLabel', {
                    defaultMessage: 'Status',
                  }),
                  description: selectedNode.data.status,
                },
              ]}
            />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </CanvasShell>
  );
}
