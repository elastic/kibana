/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPanel, EuiText, EuiSpacer, EuiEmptyPrompt, EuiLoadingElastic, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import { Streams } from '@kbn/streams-schema';
import { enrichStream } from '../stream_list_view/utils';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  useStore,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ConditionPanel } from '../data_management/shared/condition_display';
import { CUSTOM_EDGE_TYPE, CustomEdge } from './custom_edge';
import { STREAM_NODE_TYPE, StreamNode, StreamNodeData } from './custom_node';
import { PartitionEdge } from './partition_edge';
import { css } from '@emotion/css';
import { useStreamDocCountsFetch } from '../../hooks/use_streams_doc_counts_fetch';
import { getLayoutedElements } from './layout_helper';

const nodeTypes = {
  [STREAM_NODE_TYPE]: StreamNode,
};
const edgeTypes = {
  [CUSTOM_EDGE_TYPE]: CustomEdge,
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

    const wiredStreams = streams.filter((stream) =>
      Streams.WiredStream.Definition.is(stream.stream)
    );

    const enrichedStreams = wiredStreams.map(enrichStream);

    const nodes: Node<StreamNodeData>[] = [];
    const edges: Edge[] = [];

    for (const s of enrichedStreams) {
      if (!Streams.WiredStream.Definition.is(s.stream)) continue;
      const streamName = s.stream.name;
      const reactFlowNode: Node<StreamNodeData> = {
        id: streamName,
        type: STREAM_NODE_TYPE,
        position: { x: 0, y: 0 },
        data: {
          label: streamName,
          type: s.type,
          hasChildren:  s.stream.ingest.wired.routing && s.stream.ingest.wired.routing.length > 0,
          stream: s,
        },
      };
      nodes.push(reactFlowNode);

      for (const routingCondition of s.stream.ingest.wired.routing) {
        const childStreamName = routingCondition.destination;
        edges.push({
          id: `${streamName}-${childStreamName}`,
          source: streamName,
          target: childStreamName,
          type: CUSTOM_EDGE_TYPE,
          label: <PartitionEdge
            content={<ConditionPanel condition={routingCondition.where} />}
            parentDocuments={getStreamDocCounts(`${streamName}*`)}
            currentDocuments={getStreamDocCounts(`${childStreamName}*`)}
          />,
        });
      }
    }

    const { layoutedNodes, layoutedEdges } = getLayoutedElements(nodes, edges);
    return { initialNodes: layoutedNodes, initialEdges: layoutedEdges };
  }, [streams, loading, getStreamDocCounts]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

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
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
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
