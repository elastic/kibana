/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { VisualizationAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { AgentBuilderStartDependencies } from '../../../types';
import { VisualizeLens } from '../tools/esql/visualize_lens';

/**
 * Factory function that creates the visualization attachment UI definition.
 * Reuses the existing VisualizeLens component used for visualization tool results.
 */
export const createVisualizationAttachmentDefinition = ({
  startDependencies,
}: {
  startDependencies: AgentBuilderStartDependencies;
}): AttachmentUIDefinition<VisualizationAttachment> => {
  return {
    getLabel: (attachment) =>
      attachment.data.query ??
      i18n.translate('xpack.agentBuilder.attachments.visualization.label', {
        defaultMessage: 'Visualization',
      }),
    getIcon: () => 'lensApp',
    renderInlineContent: ({ attachment }) => (
      <VisualizeLens
        lensConfig={attachment.data.visualization}
        dataViews={startDependencies.dataViews}
        lens={startDependencies.lens}
        uiActions={startDependencies.uiActions}
      />
    ),
    renderCanvasContent: ({ attachment }) => (
      <VisualizeLens
        lensConfig={attachment.data.visualization}
        dataViews={startDependencies.dataViews}
        lens={startDependencies.lens}
        uiActions={startDependencies.uiActions}
      />
    ),
  };
};
