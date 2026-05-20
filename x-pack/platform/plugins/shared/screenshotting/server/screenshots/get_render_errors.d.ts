import type { HeadlessChromiumDriver } from '../browsers';
import type { Layout } from '../layouts';
import type { EventLogger } from './event_logger';
export declare const getRenderErrors: (browser: HeadlessChromiumDriver, eventLogger: EventLogger, layout: Layout) => Promise<undefined | string[]>;
