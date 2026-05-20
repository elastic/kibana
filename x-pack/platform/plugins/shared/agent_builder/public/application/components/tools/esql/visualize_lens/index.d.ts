import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import React from 'react';
import { type InlineRenderCallbacks } from '@kbn/agent-builder-browser/attachments';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
export declare function VisualizeLens({ lens, dataViews, uiActions, lensConfig, timeRange, registerActionButtons, }: {
    lens: LensPublicStart;
    dataViews: DataViewsServicePublic;
    uiActions: UiActionsStart;
    lensConfig: any;
    timeRange?: TimeRange;
    registerActionButtons?: InlineRenderCallbacks['registerActionButtons'];
}): React.JSX.Element;
