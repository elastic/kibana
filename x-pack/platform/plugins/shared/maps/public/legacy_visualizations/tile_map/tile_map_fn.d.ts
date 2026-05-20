import type { Filter } from '@kbn/es-query';
import type { Query, TimeRange } from '@kbn/es-query';
import type { ExpressionValueSearchContext } from '@kbn/data-plugin/common/search/expressions/kibana_context_type';
import type { ExpressionFunctionDefinition, Render } from '@kbn/expressions-plugin/public';
import type { TileMapVisConfig } from './types';
import { TILE_MAP_VIS_TYPE } from './types';
interface Arguments {
    visConfig: string;
}
export interface TileMapVisRenderValue {
    visType: typeof TILE_MAP_VIS_TYPE;
    visConfig: TileMapVisConfig;
    filters?: Filter[];
    query?: Query;
    timeRange?: TimeRange;
}
export type TileMapExpressionFunctionDefinition = ExpressionFunctionDefinition<'tilemap', ExpressionValueSearchContext, Arguments, Promise<Render<TileMapVisRenderValue>>>;
export declare const createTileMapFn: () => TileMapExpressionFunctionDefinition;
export {};
