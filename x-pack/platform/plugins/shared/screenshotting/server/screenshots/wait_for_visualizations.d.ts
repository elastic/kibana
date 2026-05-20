import type { HeadlessChromiumDriver } from '../browsers';
import type { Layout } from '../layouts';
import type { EventLogger } from './event_logger';
export declare const waitForVisualizations: (browser: HeadlessChromiumDriver, eventLogger: EventLogger, timeout: number, toEqual: number, layout: Layout) => Promise<void>;
