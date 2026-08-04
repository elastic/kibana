import type { Filter } from '@kbn/es-query';
import type { Query, TimeRange } from '@kbn/es-query';
import type { ExpressionValueSearchContext } from '@kbn/data-plugin/common/search/expressions/kibana_context_type';
import type { ExpressionFunctionDefinition, Render } from '@kbn/expressions-plugin/public';
import type { RegionMapVisConfig } from './types';
import { REGION_MAP_VIS_TYPE } from './types';
interface Arguments {
    visConfig: string;
}
export interface RegionMapVisRenderValue {
    visType: typeof REGION_MAP_VIS_TYPE;
    visConfig: RegionMapVisConfig;
    filters?: Filter[];
    query?: Query;
    timeRange?: TimeRange;
}
export type RegionMapExpressionFunctionDefinition = ExpressionFunctionDefinition<'regionmap', ExpressionValueSearchContext, Arguments, Promise<Render<RegionMapVisRenderValue>>>;
export declare const createRegionMapFn: () => RegionMapExpressionFunctionDefinition;
export {};
