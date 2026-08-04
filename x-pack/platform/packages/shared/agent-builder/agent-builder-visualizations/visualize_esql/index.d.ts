import type { ChartType } from '@kbn/visualization-utils';
import React from 'react';
import type { EsqlResults } from '@kbn/agent-builder-common/tools/tool_result';
import type { TimeRange } from '@kbn/agent-builder-common';
import type { VisualizationServices } from '../services';
export declare function VisualizeESQL({ services, esqlColumns, esqlQuery, preferredChartType, timeRange, }: {
    services: VisualizationServices;
    esqlColumns: EsqlResults['data']['columns'] | undefined;
    esqlQuery: string;
    preferredChartType?: ChartType;
    errorMessages?: string[];
    timeRange?: TimeRange;
}): React.JSX.Element;
