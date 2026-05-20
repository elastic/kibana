import { errors } from '../../../common';
export declare const getChromiumDisconnectedError: () => errors.BrowserClosedUnexpectedly;
export declare const getDisallowedOutgoingUrlError: (interceptedUrl: string) => errors.DisallowedOutgoingUrl;
export { HeadlessChromiumDriver } from './driver';
export type { Context } from './driver';
export { DEFAULT_VIEWPORT, HeadlessChromiumDriverFactory } from './driver_factory';
