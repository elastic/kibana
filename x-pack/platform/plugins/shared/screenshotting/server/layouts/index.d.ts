import type { Logger } from '@kbn/core/server';
import type { LayoutSelectorDictionary, Size } from '../../common/layout';
import type { HeadlessChromiumDriver } from '../browsers';
import type { BaseLayout } from './base_layout';
interface LayoutSelectors {
    /**
     * Element selectors determining the page state.
     */
    selectors: LayoutSelectorDictionary;
    /**
     * A callback to position elements before taking a screenshot.
     * @param browser Browser adapter instance.
     * @param logger Message logger.
     */
    positionElements?(browser: HeadlessChromiumDriver, logger: Logger): Promise<void>;
}
export type Layout = BaseLayout & LayoutSelectors & Partial<Size>;
export declare const DEFAULT_SELECTORS: LayoutSelectorDictionary;
export { createLayout } from './create_layout';
