import type { Ast } from '@kbn/interpreter';
import type { DateRange, DatasourceStates, Visualization, DatasourceMap, DatasourceLayers, IndexPatternMap } from '@kbn/lens-common';
export declare function getDatasourceExpressionsByLayers(datasourceMap: DatasourceMap, datasourceStates: DatasourceStates, indexPatterns: IndexPatternMap, dateRange: DateRange, nowInstant: Date, searchSessionId?: string, forceDSL?: boolean): undefined | Record<string, Ast>;
export declare function buildExpression({ visualization, visualizationState, datasourceMap, datasourceStates, datasourceLayers, title, description, indexPatterns, dateRange, nowInstant, searchSessionId, forceDSL, }: {
    title?: string;
    description?: string;
    visualization: Visualization | null;
    visualizationState: unknown;
    datasourceMap: DatasourceMap;
    datasourceStates: DatasourceStates;
    datasourceLayers: DatasourceLayers;
    indexPatterns: IndexPatternMap;
    searchSessionId?: string;
    dateRange: DateRange;
    nowInstant: Date;
    forceDSL?: boolean;
}): Ast | null;
