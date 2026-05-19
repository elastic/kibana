import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { ChartType } from '@kbn/visualization-utils';
import React from 'react';
import type { EsqlResults } from '@kbn/agent-builder-common/tools/tool_result';
import type { TimeRange } from '@kbn/agent-builder-common';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
export declare function VisualizeESQL({ lens, dataViews, uiActions, esqlColumns, esqlQuery, preferredChartType, timeRange, }: {
    lens: LensPublicStart;
    dataViews: DataViewsServicePublic;
    esqlColumns: EsqlResults['data']['columns'] | undefined;
    uiActions: UiActionsStart;
    esqlQuery: string;
    preferredChartType?: ChartType;
    errorMessages?: string[];
    timeRange?: TimeRange;
}): React.JSX.Element;
