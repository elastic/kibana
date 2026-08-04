import type { IUiSettingsClient } from '@kbn/core/public';
import type { ExpressionAstExpression } from '@kbn/expressions-plugin/public';
import type { DateRange, FormBasedPrivateState, GenericIndexPatternColumn, IndexPatternMap } from '@kbn/lens-common';
export type OriginalColumn = {
    id: string;
} & GenericIndexPatternColumn;
declare global {
    interface Window {
        /**
         * Debug setting to make requests complete slower than normal. data.search.aggs.shardDelay.enabled has to be set via settings for this to work
         */
        ELASTIC_LENS_DELAY_SECONDS?: number;
    }
}
export declare const extractAggId: (id: string) => string;
export declare function toExpression(state: FormBasedPrivateState, layerId: string, indexPatterns: IndexPatternMap, uiSettings: IUiSettingsClient, dateRange: DateRange, nowInstant: Date, searchSessionId?: string, forceDSL?: boolean): ExpressionAstExpression | null;
