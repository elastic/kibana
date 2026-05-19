import type { HeadlessChromiumDriver } from '../browsers';
import type { Layout } from '../layouts';
import type { EventLogger } from './event_logger';
import type { ElementsPositionAndAttribute } from './get_element_position_data';
import type { Screenshot } from './types';
/**
 * Get screenshots of multiple areas of the page
 */
export declare const getScreenshots: (browser: HeadlessChromiumDriver, eventLogger: EventLogger, options: {
    elements: ElementsPositionAndAttribute[];
    layout: Layout;
    error?: Error;
}) => Promise<Screenshot[]>;
