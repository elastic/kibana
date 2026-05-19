import type { Headers } from '@kbn/core/server';
import type { Context, HeadlessChromiumDriver } from '../browsers';
import type { EventLogger } from './event_logger';
export declare const openUrl: (browser: HeadlessChromiumDriver, eventLogger: EventLogger, timeout: number, index: number, url: string, context: Context, headers: Headers) => Promise<void>;
