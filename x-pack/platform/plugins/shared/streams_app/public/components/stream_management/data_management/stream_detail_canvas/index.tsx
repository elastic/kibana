/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { buildClassicStreamsGraph } from './build_graph';
import { CanvasContextMenu, type ContextMenuPosition } from './canvas_context_menu';
import { canvasEdgeTypes, canvasNodeTypes } from './registry';
import type { ClassicCanvasNode } from './types';

interface StreamDetailCanvasProps {
  definition: Streams.ingest.all.GetResponse;
}

const getCanvasContainerStyles = (euiTheme: UseEuiTheme['euiTheme']) => css`
  position: relative;
  height: calc(100vh - 230px);
  min-height: 520px;
  background: ${euiTheme.colors.backgroundBaseSubdued};
`;

/**
 * For classic streams the canvas renders every classic stream as an inferred
 * source -> destination pair, so the content is the same regardless of which
 * classic stream's tab is open. Wired (and any other) streams keep the mock
 * canvas until their topology is wired to real data.
 */
export function StreamDetailCanvas({ definition }: StreamDetailCanvasProps) {
  if (Streams.ClassicStream.GetResponse.is(definition)) {
    return <ClassicStreamsCanvas />;
  }

  return <MockStreamCanvas streamName={definition.stream.name} />;
}

function ClassicStreamsCanvas() {
  const { euiTheme } = useEuiTheme();
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { value, loading } = useStreamsAppFetch(
    ({ signal }) => streamsRepositoryClient.fetch('GET /internal/streams/classic', { signal }),
    [streamsRepositoryClient]
  );

  const graph = useMemo(() => buildClassicStreamsGraph(value?.streams ?? []), [value]);

  // Local (non-persisted) node state so nodes can be dragged around the canvas.
  // Positions reset to the inferred layout whenever the fetched streams change.
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph, setNodes, setEdges]);

  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null);

  const closeContextMenu = useCallback(() => setContextMenuPosition(null), []);

  const onNodeContextMenu = useCallback<NodeMouseHandler<ClassicCanvasNode>>((event) => {
    event.preventDefault();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
  }, []);

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      closeContextMenu();
    },
    [closeContextMenu]
  );

  if (loading && !value) {
    return (
      <EuiFlexGroup
        justifyContent="center"
        alignItems="center"
        css={getCanvasContainerStyles(euiTheme)}
      >
        <EuiLoadingSpinner size="xl" data-test-subj="streamsCanvasLoading" />
      </EuiFlexGroup>
    );
  }

  if (graph.nodes.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="graphApp"
        data-test-subj="streamsCanvasEmptyPrompt"
        title={
          <h2>
            {i18n.translate('xpack.streams.canvas.noClassicStreamsTitle', {
              defaultMessage: 'No classic streams',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.streams.canvas.noClassicStreamsBody', {
              defaultMessage: 'Classic streams appear here as source to destination flows.',
            })}
          </p>
        }
      />
    );
  }

  return (
    <ReactFlowProvider>
      <EuiPanel
        hasShadow={false}
        hasBorder={false}
        paddingSize="none"
        css={getCanvasContainerStyles(euiTheme)}
        data-test-subj="streamsCanvasTab"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeContextMenu={onNodeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          nodeTypes={canvasNodeTypes}
          edgeTypes={canvasEdgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesConnectable={false}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
        <CanvasContextMenu position={contextMenuPosition} onClose={closeContextMenu} />
      </EuiPanel>
    </ReactFlowProvider>
  );
}

type MockCanvasNodeType = 'source' | 'pipeline' | 'route' | 'destination';

interface MockCanvasNodeData extends Record<string, unknown> {
  label: string;
  type: MockCanvasNodeType;
  description: string;
  status: string;
}

type MockCanvasNode = Node<MockCanvasNodeData>;
type MockCanvasEdge = Edge;

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

function MockStreamCanvas({ streamName }: { streamName: string }) {
  const { euiTheme } = useEuiTheme();
  const [selectedNode, setSelectedNode] = useState<MockCanvasNode | null>(null);

  const nodes = useMemo<MockCanvasNode[]>(
    () => [
      {
        id: 'source-default',
        position: { x: 0, y: 120 },
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
    <ReactFlowProvider>
      <EuiPanel
        hasShadow={false}
        hasBorder={false}
        paddingSize="none"
        css={getCanvasContainerStyles(euiTheme)}
        data-test-subj="streamsCanvasTab"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          onNodeClick={handleNodeClick}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
        >
          <Background />
          <Controls />
        </ReactFlow>
      </EuiPanel>
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
    </ReactFlowProvider>
  );
}
