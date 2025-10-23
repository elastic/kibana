/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPanel, EuiText, EuiSpacer, EuiEmptyPrompt, EuiLoadingElastic, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import { Streams } from '@kbn/streams-schema';
import { asTrees, enrichStream } from '../stream_list_view/utils';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  useStore,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ConditionPanel } from '../data_management/shared/condition_display';
import { CustomEdge } from './custom_edge';
import { StreamNode, StreamNodeData } from './custom_node';
import { PartitionEdge } from './partition_edge';
import { css } from '@emotion/css';
import { useStreamDocCountsFetch } from '../../hooks/use_streams_doc_counts_fetch';

const LAYOUT_CONSTANTS = {
  NODE_WIDTH: 200,
  LEVEL_HEIGHT: 150,
  SIBLING_SPACING: 50
}

const nodeTypes = {
  'streamNode': StreamNode,
};
const edgeTypes = {
  'custom-edge': CustomEdge,
};

interface StreamsGraphProps {
  streams?: ListStreamDetail[];
  loading?: boolean;
}

export function StreamsGraph({ streams, loading = false }: StreamsGraphProps) {
  if (loading || !streams) {
    return (
      <EuiPanel paddingSize="l">
        <EuiFlexGroup direction='column' className={css`height: 100%;`}>
          <EuiText>
            <h3>
              {i18n.translate('xpack.streams.streamsGraph.title', {
                defaultMessage: 'Streams Graph',
              })}
            </h3>
            <p>
              {i18n.translate('xpack.streams.streamsGraph.description', {
                defaultMessage: 'Visual representation of wired streams and their hierarchical relationships.',
              })}
            </p>
          </EuiText>
          <EuiFlexItem grow={1}>
            <EuiEmptyPrompt
              icon={<EuiLoadingElastic size="xl" />}
              title={
                  <h2>
                      {i18n.translate('xpack.streams.streamsGraph.loading', {
                          defaultMessage: 'Loading graph',
                      })}
                  </h2>
              }
              className={css`
                display: flex;
                flex-grow: 1;
                justify-content: center;
                align-items: center;
              `}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  return (
    <ReactFlowProvider>
      <Graph streams={streams} loading={loading} />
    </ReactFlowProvider>
  );
}

const Graph = ({ streams, loading = false }: StreamsGraphProps) => {
  const widthSelector = (state: { width: any }) => state.width;
  const heightSelector = (state: { height: any }) => state.height;
  const reactFlowWidth = useStore(widthSelector);
  const reactFlowHeight = useStore(heightSelector);
  const reactFlow = useReactFlow();

  useEffect(() => {
    reactFlow.fitView();
  }, [reactFlowWidth, reactFlowHeight, reactFlow]);

  const { getStreamDocCounts } = useStreamDocCountsFetch({
    groupTotalCountByTimestamp: false,
    canReadFailureStore: false,
  });

  const { initialNodes, initialEdges } = useMemo(() => {
    if (loading || !streams || streams.length === 0) {
      return { initialNodes: [], initialEdges: [] };
    }

    const wiredStreams = streams?.filter((stream) =>
      Streams.WiredStream.Definition.is(stream.stream)
    );

    const enrichedStreams = wiredStreams.map(enrichStream);
    const trees = asTrees(enrichedStreams);

    const nodes: Node<StreamNodeData>[] = [];
    const edges: Edge[] = [];

    const buildGraph = (treeNodes: any[], level = 0, parentX = 0, parentId?: string) => {
      treeNodes.forEach((node, index) => {
        const nodeId = node.stream.name;
        const x = parentX + (index - (treeNodes.length - 1) / 2) * (LAYOUT_CONSTANTS.NODE_WIDTH + LAYOUT_CONSTANTS.SIBLING_SPACING);
        const y = level * LAYOUT_CONSTANTS.LEVEL_HEIGHT;

        const reactFlowNode: Node<StreamNodeData> = {
          id: nodeId,
          type: 'streamNode',
          position: { x, y },
          data: {
            label: node.stream.name,
            type: node.type || 'wired',
            level,
            hasParent: !!parentId,
            hasChildren: node.children && node.children.length > 0,
          },
        };

        nodes.push(reactFlowNode);

        // Create edge to parent
        if (parentId) {
          console.log(`Creating edge from ${parentId} to ${nodeId}`);

          const parentStream = streams.find(s => s.stream.name === parentId);
          const routingCondition = parentStream && 'ingest' in parentStream.stream &&
            'wired' in parentStream.stream.ingest &&
            parentStream.stream.ingest.wired?.routing?.find((x: any) => x.destination === nodeId)?.where;
          const routingConditionPanel = routingCondition ? <ConditionPanel condition={routingCondition} /> : null;

          edges.push({
            id: `${parentId}-${nodeId}`,
            source: parentId,
            target: nodeId,
            type: 'custom-edge',
            label: <PartitionEdge
              content={routingConditionPanel}
              parentDocuments={getStreamDocCounts(`${parentId}*`)}
              currentDocuments={getStreamDocCounts(`${nodeId}*`)}
              id={`${parentId}-${nodeId}`}
            />,
          });
        }

        // Recursively process children
        if (node.children && node.children.length > 0) {
          buildGraph(node.children, level + 1, x, nodeId);
        }
      });
    };

    buildGraph(trees);

    return { initialNodes: nodes, initialEdges: edges };
  }, [streams, loading]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <EuiPanel paddingSize="l">
      <EuiText>
        <h3>
          {i18n.translate('xpack.streams.streamsGraph.title', {
            defaultMessage: 'Streams Graph',
          })}
        </h3>
        <p>
          {i18n.translate('xpack.streams.streamsGraph.description', {
            defaultMessage: 'Visual representation of wired streams and their hierarchical relationships.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      <div style={{ width: '100%', height: '600px', border: '1px solid #d3dae6', borderRadius: '6px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          attributionPosition="bottom-left"
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>
    </EuiPanel>
  );
};
