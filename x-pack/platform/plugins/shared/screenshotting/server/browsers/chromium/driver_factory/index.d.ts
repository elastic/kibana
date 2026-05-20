import type { Logger } from '@kbn/core/server';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/server';
import type { ConfigType } from '@kbn/screenshotting-server';
import type { Browser, Page, Viewport } from 'puppeteer';
import * as Rx from 'rxjs';
import type { PerformanceMetrics } from '../../../../common/types';
import { HeadlessChromiumDriver } from '../driver';
interface CreatePageOptions {
    browserTimezone?: string;
    defaultViewport: {
        width?: number;
        deviceScaleFactor?: number;
    };
    openUrlTimeout: number;
}
interface CreatePageResult {
    driver: HeadlessChromiumDriver;
    error$: Rx.Observable<Error>;
    /**
     * Close the page and the browser.
     *
     * @note Ensure this function gets called once all actions against the page
     * have concluded. This ensures the browser is closed and gives the OS a chance
     * to reclaim resources like memory.
     */
    close: () => Rx.Observable<ClosePageResult>;
}
interface ClosePageResult {
    metrics?: PerformanceMetrics;
}
/**
 * Size of the desired initial viewport. This is needed to render the app before elements load into their
 * layout. Once the elements are positioned, the viewport must be *resized* to include the entire element container.
 */
export declare const DEFAULT_VIEWPORT: Required<Pick<Viewport, 'width' | 'height' | 'deviceScaleFactor'>>;
export declare class HeadlessChromiumDriverFactory {
    private screenshotMode;
    private config;
    private logger;
    private binaryPath;
    private basePath;
    private userDataDir;
    type: string;
    constructor(screenshotMode: ScreenshotModePluginSetup, config: ConfigType, logger: Logger, binaryPath: string, basePath: string);
    private getChromiumArgs;
    createPage({ browserTimezone, openUrlTimeout, defaultViewport }: CreatePageOptions, pLogger?: Logger): Rx.Observable<CreatePageResult>;
    /**
     * In certain cases the browser will emit an error object to console. To ensure
     * we extract the message from the error object we need to go the browser's context
     * and look at the error there.
     *
     * If we don't do this we we will get a string that says "JSHandle@error" from
     * line.text().
     *
     * See https://github.com/puppeteer/puppeteer/issues/3397.
     */
    private getErrorMessage;
    private getPageEventAsObservable;
    getBrowserLogger(page: Page, logger: Logger): Rx.Observable<void>;
    getProcessLogger(browser: Browser, logger: Logger): Rx.Observable<void>;
    getPageExit(browser: Browser, page: Page): Rx.Observable<Error>;
    diagnose(overrideFlags?: string[]): Rx.Observable<string>;
}
export {};
