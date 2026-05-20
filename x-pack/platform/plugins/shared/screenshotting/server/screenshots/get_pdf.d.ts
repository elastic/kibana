import type { EventLogger } from './event_logger';
import type { HeadlessChromiumDriver } from '../browsers';
import type { Screenshot } from './types';
export declare function getPdf(browser: HeadlessChromiumDriver, logger: EventLogger, title: string, options?: {
    error?: Error;
    logo?: string;
}): Promise<Screenshot[]>;
