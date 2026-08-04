import type { TimeRange } from '@kbn/es-query';
import React from 'react';
import { type InlineRenderCallbacks } from '@kbn/agent-builder-browser/attachments';
import type { VisualizationServices } from '../services';
export declare function VisualizeLens({ services, lensConfig, timeRange, registerActionButtons, }: {
    services: VisualizationServices;
    lensConfig: any;
    timeRange?: TimeRange;
    registerActionButtons?: InlineRenderCallbacks['registerActionButtons'];
}): React.JSX.Element;
