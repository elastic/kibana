/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { VisualizationAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { AgentBuilderStartDependencies } from '../../../types';

const LazyVisualizeLens = React.lazy(() =>
  import('../tools/esql/visualize_lens').then((m) => ({ default: m.VisualizeLens }))
);

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
      <Suspense fallback={<EuiLoadingSpinner />}>
        <LazyVisualizeLens
          lensConfig={attachment.data.visualization}
          dataViews={startDependencies.dataViews}
          lens={startDependencies.lens}
          uiActions={startDependencies.uiActions}
        />
      </Suspense>
    ),
  };
};
