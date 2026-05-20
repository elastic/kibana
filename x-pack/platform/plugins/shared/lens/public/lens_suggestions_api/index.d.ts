import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { ChartType } from '@kbn/visualization-utils';
import type { DatasourceMap, VisualizationMap, VisualizeEditorContext, TypedLensByValueInput } from '@kbn/lens-common';
interface SuggestionsApiProps {
    context: VisualizeFieldContext | VisualizeEditorContext;
    dataView: DataView;
    visualizationMap?: VisualizationMap;
    datasourceMap?: DatasourceMap;
    excludedVisualizations?: string[];
    preferredChartType?: ChartType;
    preferredVisAttributes?: TypedLensByValueInput['attributes'];
}
export declare const suggestionsApi: ({ context, dataView, datasourceMap, visualizationMap, excludedVisualizations, preferredChartType, preferredVisAttributes, }: SuggestionsApiProps) => import("@kbn/lens-common").Suggestion<unknown, unknown>[] | undefined;
export {};
