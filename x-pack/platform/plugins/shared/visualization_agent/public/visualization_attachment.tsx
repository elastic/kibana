/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { VisualizationAttachment } from '@kbn/agent-visualization-common';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { VisualizeLens } from './visualize_lens';

export const createVisualizationAttachmentDefinition = ({
  dataViews,
  lens,
  uiActions,
  canWriteDashboards,
}: {
  dataViews: DataViewsPublicPluginStart;
  lens: LensPublicStart;
  uiActions: UiActionsStart;
  canWriteDashboards: boolean;
}): AttachmentUIDefinition<VisualizationAttachment> => ({
  getLabel: (attachment) =>
    attachment.data.query ??
    i18n.translate('xpack.visualizationAgent.attachments.visualization.label', {
      defaultMessage: 'Visualization',
    }),
  getIcon: () => 'lensApp',
  renderInlineContent: ({ attachment, screenContext }) => {
    const timeRange = attachment.data.time_range ?? screenContext?.time_range;

    return (
      <Suspense fallback={<EuiLoadingSpinner />}>
        <VisualizeLens
          lensConfig={attachment.data.visualization}
          dataViews={dataViews}
          lens={lens}
          uiActions={uiActions}
          timeRange={timeRange}
          canWriteDashboards={canWriteDashboards}
        />
      </Suspense>
    );
  },
});
