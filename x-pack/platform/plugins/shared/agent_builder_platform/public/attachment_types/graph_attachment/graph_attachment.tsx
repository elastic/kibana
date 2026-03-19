/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { css } from '@emotion/react';
import { EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { type AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { GraphAttachment } from '../../../common/attachments';

const GraphFlowCanvas = React.lazy(() =>
  import('./graph_flow_canvas').then((module) => ({ default: module.GraphFlowCanvas }))
);

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

  return (
    <div
      css={css`
        width: 100%;
        height: 420px;
      `}
    >
      <Suspense
        fallback={
          <div
            css={css`
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
            `}
          >
            <EuiLoadingSpinner size="l" />
          </div>
        }
      >
        <GraphFlowCanvas
          nodes={attachment.data.nodes}
          edges={attachment.data.edges}
          colorMode={colorMode}
        />
      </Suspense>
    </div>
  );
};
