import type { HeadlessChromiumDriver } from '../browsers';
import type { Layout } from '../layouts';
import type { EventLogger } from './event_logger';
export declare const getNumberOfItems: (browser: HeadlessChromiumDriver, eventLogger: EventLogger, timeout: number, layout: Layout) => Promise<number>;
