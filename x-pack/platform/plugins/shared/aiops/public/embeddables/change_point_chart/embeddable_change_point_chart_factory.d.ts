import { EMBEDDABLE_CHANGE_POINT_CHART_TYPE } from '@kbn/aiops-change-point-detection/constants';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../../types';
import type { ChangePointEmbeddableApi } from './types';
export type EmbeddableChangePointChartType = typeof EMBEDDABLE_CHANGE_POINT_CHART_TYPE;
export declare const getChangePointChartEmbeddableFactory: (getStartServices: StartServicesAccessor<AiopsPluginStartDeps, AiopsPluginStart>) => EmbeddablePublicDefinition<Readonly<{
    description?: string | undefined;
    title?: string | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    split_field?: string | undefined;
    partitions?: string[] | undefined;
} & {
    data_view_id: string;
    view_type: "table" | "charts";
    aggregation_function: "avg" | "max" | "min" | "sum";
    metric_field: string;
    max_series_to_plot: number;
}>, ChangePointEmbeddableApi>;
