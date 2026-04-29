/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ChartType } from '@kbn/visualization-utils';
import type { EsqlVisualizationInputAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { AgentBuilderStartDependencies } from '../../../types';

const LazyVisualizeESQL = React.lazy(() =>
  import('../tools/esql/visualize_esql').then((m) => ({ default: m.VisualizeESQL }))
);

export const createEsqlVisualizationInputAttachmentDefinition = ({
  startDependencies,
}: {
  startDependencies: AgentBuilderStartDependencies;
}): AttachmentUIDefinition<EsqlVisualizationInputAttachment> => {
  return {
    getLabel: () =>
      i18n.translate('xpack.agentBuilder.attachments.esqlVisualizationInput.label', {
        defaultMessage: 'ES|QL visualization',
      }),
    getIcon: () => 'lensApp',
    renderInlineContent: ({ attachment, screenContext }) => {
      console.log('attachment', attachment);
      const timeRange = attachment.data.time_range ?? screenContext?.time_range;

      return (
        <Suspense fallback={<EuiLoadingSpinner />}>
          <LazyVisualizeESQL
            lens={startDependencies.lens}
            dataViews={startDependencies.dataViews}
            uiActions={startDependencies.uiActions}
            esqlQuery={attachment.data.query}
            esqlColumns={attachment.data.columns}
            preferredChartType={attachment.data.chart_type as ChartType | undefined}
            timeRange={timeRange}
          />
        </Suspense>
      );
    },
  };
};
