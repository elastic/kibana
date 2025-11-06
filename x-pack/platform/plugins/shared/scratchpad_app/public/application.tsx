/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { EuiPageTemplate } from '@elastic/eui';
import type { NodeChange, EdgeChange, Connection } from '@xyflow/react';
import type { TimeRange } from '@kbn/es-query';
import type { ScratchpadAppStartDependencies } from './types';
import { ScratchpadCanvas } from './components/scratchpad_canvas';
import { ScratchpadToolbar, getNextNodePosition } from './components/scratchpad_toolbar';
import { NodeEditModal } from './components/node_edit_modal';
import { useScratchpadState, type ScratchpadNode } from './hooks/use_scratchpad_state';
import { useScratchpadScreenContext } from './hooks/use_scratchpad_screen_context';
import { layoutNodes } from './utils/layout_nodes';

export function ScratchpadApplication({
  coreStart,
  pluginsStart,
  appMountParameters,
}: {
  coreStart: CoreStart;
  pluginsStart: ScratchpadAppStartDependencies;
  appMountParameters: AppMountParameters;
}) {
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    addNode,
    updateNode,
    deleteNode,
    createEdge,
    clearAll,
  } = useScratchpadState();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [shouldFitView, setShouldFitView] = useState(false);
  const [layoutKey, setLayoutKey] = useState(0);
  const [timeRange, setTimeRange] = useState<TimeRange>({
    from: 'now-15m',
    to: 'now',
  });

  // Integrate AI assistant screen context
  useScratchpadScreenContext({
    nodes,
    edges,
    addNode,
    updateNode,
    deleteNode,
    createEdge,
  });

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Update nodes based on ReactFlow changes (e.g., position updates)
      setNodes((prevNodes) => {
        const updatedNodes = [...prevNodes];
        changes.forEach((change) => {
          if (change.type === 'position' && change.position) {
            const index = updatedNodes.findIndex((n) => n.id === change.id);
            if (index !== -1) {
              updatedNodes[index] = {
                ...updatedNodes[index],
                position: change.position,
              };
            }
          } else if (change.type === 'select') {
            // Handle selection changes - ensure only one node is selected
            if (change.selected) {
              setSelectedNodeId(change.id);
            } else {
              // Deselect if this node was deselected
              if (selectedNodeId === change.id) {
                setSelectedNodeId(null);
              }
            }
          }
        });
        return updatedNodes;
      });
    },
    [setNodes, selectedNodeId]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Handle edge deletion
      changes.forEach((change) => {
        if (change.type === 'remove') {
          setEdges((prev) => prev.filter((e) => e.id !== change.id));
        }
      });
    },
    [setEdges]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        createEdge(connection.source, connection.target);
      }
    },
    [createEdge]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: ScratchpadNode) => {
      // Clear previous selection and set new one
      const newSelectedId = node.id;
      setSelectedNodeId(newSelectedId);
      // Update nodes to ensure only the clicked node is selected
      setNodes((prevNodes) =>
        prevNodes.map((n) => ({
          ...n,
          selected: n.id === newSelectedId,
          data: {
            ...n.data,
            // Reset any transient selection state within node data if needed
            selected: n.id === newSelectedId,
          },
        }))
      );
    },
    [setNodes]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    // Clear selection from all nodes
    setNodes((prevNodes) =>
      prevNodes.map((n) => ({
        ...n,
        selected: false,
        data: {
          ...n.data,
          selected: false,
        },
      }))
    );
  }, [setNodes]);

  const handleNodeDoubleClick = useCallback((_event: React.MouseEvent, node: ScratchpadNode) => {
    setEditingNodeId(node.id);
  }, []);

  const handleSaveNode = useCallback(
    (nodeId: string, updates: Partial<ScratchpadNode>) => {
      updateNode(nodeId, updates);
      setEditingNodeId(null);
    },
    [updateNode]
  );

  const handleAddNode = useCallback(
    (type: ScratchpadNode['type']) => {
      const position = getNextNodePosition(nodes);
      const nodeId = `${type}-${Date.now()}`;

      const newNode: ScratchpadNode = {
        id: nodeId,
        type,
        position,
        data: {
          type,
          ...(type === 'text_note' && { content: 'New note', title: 'Note' }),
          ...(type === 'esql_query' && { query: 'FROM index | LIMIT 10' }),
          ...(type === 'kibana_link' && { url: '', title: 'Link', appId: '' }),
        },
      };

      addNode(newNode);

      // If a node is selected, create an edge from selected node to new node
      if (selectedNodeId) {
        createEdge(selectedNodeId, nodeId);
      }
    },
    [nodes, addNode, selectedNodeId, createEdge]
  );

  const handleClearAll = useCallback(() => {
    clearAll();
    setSelectedNodeId(null);
    setEditingNodeId(null);
  }, [clearAll]);

  const handleLayout = useCallback(() => {
    const layoutedNodes = layoutNodes(nodes, edges);
    // Force complete update by setting all nodes with new positions
    setNodes(layoutedNodes);
    // Increment layout key to force ReactFlow to re-render
    setLayoutKey((prev) => prev + 1);
    setShouldFitView(true);
    // Reset after fitView is triggered
    setTimeout(() => setShouldFitView(false), 200);
  }, [nodes, edges, setNodes]);

  return (
    <KibanaContextProvider
      services={{
        ...coreStart,
        ...pluginsStart,
        plugins: {
          start: pluginsStart,
        },
      }}
    >
      <EuiPageTemplate>
        <ScratchpadToolbar
          key="toolbar"
          onAddNode={handleAddNode}
          onClearAll={handleClearAll}
          onLayout={handleLayout}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
        <EuiPageTemplate.Section paddingSize="none" style={{ height: 'calc(100vh - 200px)' }}>
          <ScratchpadCanvas
            nodes={nodes.map((node) => ({
              ...node,
              selected: node.id === selectedNodeId,
              data: {
                ...node.data,
                selected: node.id === selectedNodeId,
              },
            }))}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            onPaneClick={handlePaneClick}
            shouldFitView={shouldFitView}
            layoutKey={layoutKey}
            onUpdateNode={updateNode}
            timeRange={timeRange}
          />
        </EuiPageTemplate.Section>
        <NodeEditModal
          node={editingNodeId ? nodes.find((n) => n.id === editingNodeId) || null : null}
          onClose={() => setEditingNodeId(null)}
          onSave={handleSaveNode}
        />
      </EuiPageTemplate>
    </KibanaContextProvider>
  );
}
