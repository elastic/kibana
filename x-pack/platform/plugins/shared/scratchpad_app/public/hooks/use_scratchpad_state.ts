/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';

export interface ScratchpadNodeData {
  type: 'esql_query' | 'text_note' | 'kibana_link';
  [key: string]: unknown;
}

export interface ScratchpadNode extends Node {
  data: ScratchpadNodeData;
}

export interface ScratchpadState {
  nodes: ScratchpadNode[];
  edges: Edge[];
}

const STORAGE_KEY = 'kibana.scratchpad.state';

export function useScratchpadState() {
  const [nodes, setNodes] = useState<ScratchpadNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ScratchpadState;
        setNodes(parsed.nodes || []);
        setEdges(parsed.edges || []);
      }
    } catch (error) {
      // Silently fail - this is expected for new users
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      const state: ScratchpadState = { nodes, edges };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // Silently fail - localStorage might be disabled
    }
  }, [nodes, edges]);

  const addNode = useCallback((node: ScratchpadNode) => {
    setNodes((prev) => [...prev, node]);
    return node.id;
  }, []);

  const updateNode = useCallback((nodeId: string, updates: Partial<ScratchpadNode>) => {
    setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, ...updates } : node)));
  }, []);

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((prev) => prev.filter((node) => node.id !== nodeId));
      setEdges((prev) => prev.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    },
    []
  );

  const createEdge = useCallback(
    (sourceId: string, targetId: string) => {
      // Check if edge already exists
      setEdges((prev) => {
        const edgeExists = prev.some(
          (e) => e.source === sourceId && e.target === targetId
        );
        if (edgeExists) {
          return prev;
        }
        const edge: Edge = {
          id: `${sourceId}-${targetId}-${Date.now()}`,
          source: sourceId,
          target: targetId,
        };
        return [...prev, edge];
      });
    },
    []
  );

  const clearAll = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, []);

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    addNode,
    updateNode,
    deleteNode,
    createEdge,
    clearAll,
  };
}
