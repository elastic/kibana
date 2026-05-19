import type { Ensure, SerializableRecord } from '@kbn/utility-types';
/**
 * @internal
 */
export type Size = Ensure<{
    /**
     * Layout width.
     */
    width: number;
    /**
     * Layout height.
     */
    height: number;
}, SerializableRecord>;
/**
 * @internal
 */
export interface LayoutSelectorDictionary {
    screenshot: string;
    renderComplete: string;
    renderError: string;
    renderErrorAttribute: string;
    itemsCountAttribute: string;
    timefilterDurationAttribute: string;
}
/**
 * Screenshot layout parameters.
 */
export type LayoutParams<Id = LayoutType> = Ensure<{
    /**
     * Unique layout name.
     */
    id?: Id;
    /**
     * Layout sizing.
     */
    dimensions?: Size;
    /**
     * Element selectors determining the page state.
     */
    selectors?: Partial<LayoutSelectorDictionary>;
    /**
     * Page zoom.
     */
    zoom?: number;
}, SerializableRecord>;
/**
 * Supported layout types.
 */
export type LayoutType = 'preserve_layout' | 'print' | 'canvas';
