import type { HasType } from '@kbn/presentation-publishing';
import type { RenderToolTipContent } from '../../classes/tooltips/tooltip_property';
export declare const MAP_RENDERER_TYPE = "mapRenderer";
export type MapRendererApi = HasType<typeof MAP_RENDERER_TYPE> & {
    getTooltipRenderer?: () => RenderToolTipContent;
    hideFilterActions?: boolean;
    isSharable?: boolean;
};
export declare function isMapRendererApi(api: unknown): api is MapRendererApi;
