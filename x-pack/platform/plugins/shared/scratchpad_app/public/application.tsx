/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { EuiPageTemplate } from '@elastic/eui';
import type { NodeChange, EdgeChange } from '@xyflow/react';
import type { ScratchpadAppStartDependencies } from './types';
import { ScratchpadCanvas } from './components/scratchpad_canvas';
import { useScratchpadState } from './hooks/use_scratchpad_state';

export function ScratchpadApplication({
  coreStart,
  pluginsStart,
  appMountParameters,
}: {
  coreStart: CoreStart;
  pluginsStart: ScratchpadAppStartDependencies;
  appMountParameters: AppMountParameters;
}) {
  const { nodes, edges, setNodes } = useScratchpadState();

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
          }
        });
        return updatedNodes;
      });
    },
    [setNodes]
  );

  const handleEdgesChange = useCallback((_changes: EdgeChange[]) => {
    // Handle edge changes if needed
    // For now, we'll keep it simple
  }, []);

  return (
    <KibanaContextProvider services={{ ...coreStart, ...pluginsStart }}>
      <EuiPageTemplate>
        <EuiPageTemplate.Header pageTitle="Scratchpad" />
        <EuiPageTemplate.Section paddingSize="none" style={{ height: 'calc(100vh - 200px)' }}>
          <ScratchpadCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
          />
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </KibanaContextProvider>
  );
}
