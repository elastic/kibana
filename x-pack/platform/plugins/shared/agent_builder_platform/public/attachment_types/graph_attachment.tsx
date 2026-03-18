/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { Background, Controls, ReactFlow, ReactFlowProvider, type ColorMode } from '@xyflow/react';
import { i18n } from '@kbn/i18n';
import type { GraphAttachment } from '@kbn/agent-builder-common/attachments';
import { type AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';

import '@xyflow/react/dist/style.css';

interface GraphContentProps {
  attachment: GraphAttachment;
}

export const graphAttachmentDefinition: AttachmentUIDefinition<GraphAttachment> = {
  getLabel: (attachment) =>
    attachment.data.title ??
    i18n.translate('xpack.agentBuilderPlatform.attachments.graph.label', {
      defaultMessage: 'Graph',
    }),
  getIcon: () => 'graphApp',
  renderInlineContent: ({ attachment }) => <GraphContent attachment={attachment} />,
};

const GraphContent: React.FC<GraphContentProps> = ({ attachment }) => {
  const { colorMode } = useEuiTheme();

  if (attachment.data.nodes.length === 0) {
    return null;
  }

  return (
    <div
      css={css`
        width: 100%;
        height: 420px;
      `}
    >
      <ReactFlowProvider>
        <ReactFlow
          nodes={attachment.data.nodes}
          edges={attachment.data.edges}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          proOptions={{ hideAttribution: true }}
          colorMode={colorMode.toLowerCase() as ColorMode}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
};
