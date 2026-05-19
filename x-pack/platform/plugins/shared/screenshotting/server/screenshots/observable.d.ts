import type { Headers } from '@kbn/core/server';
import type { ConfigType } from '@kbn/screenshotting-server';
import type { Observable } from 'rxjs';
import type { Context, HeadlessChromiumDriver } from '../browsers';
import type { Layout } from '../layouts';
import type { EventLogger } from './event_logger';
import type { ElementsPositionAndAttribute } from './get_element_position_data';
import type { PhaseInstance, Screenshot } from './types';
type Url = string;
type UrlWithContext = [url: Url, context: Context];
export type UrlOrUrlWithContext = Url | UrlWithContext;
export interface ScreenshotObservableOptions {
    /**
     * The browser timezone that will be emulated in the browser instance.
     * This option should be used to keep timezone on server and client in sync.
     */
    browserTimezone?: string;
    /**
     * Custom headers to be sent with each request.
     */
    headers?: Headers;
    /**
     * The list or URL to take screenshots of.
     * Every item can either be a string or a tuple containing a URL and a context.
     */
    urls: UrlOrUrlWithContext[];
}
export interface ScreenshotObservableResult {
    /**
     * Used time range filter.
     */
    timeRange: string | null;
    /**
     * Taken screenshots.
     */
    screenshots: Screenshot[];
    /**
     * Error that occurred during the screenshotting.
     */
    error?: Error;
    /**
     * Individual visualizations might encounter errors at runtime. If there are any they are added to this
     * field. Any text captured here is intended to be shown to the user for debugging purposes, reporting
     * does no further sanitization on these strings.
     */
    renderErrors?: string[];
    /**
     * @internal
     */
    elementsPositionAndAttributes?: ElementsPositionAndAttribute[];
}
interface PageSetupResults {
    elementsPositionAndAttributes: ElementsPositionAndAttribute[] | null;
    timeRange: string | null;
    error?: Error;
    renderErrors?: string[];
}
export declare class ScreenshotObservableHandler {
    private readonly driver;
    private readonly eventLogger;
    private readonly layout;
    private options;
    private timeouts;
    constructor(driver: HeadlessChromiumDriver, config: ConfigType, eventLogger: EventLogger, layout: Layout, options: ScreenshotObservableOptions);
    waitUntil<O>(phase: PhaseInstance): (source: Observable<O>) => Observable<O>;
    private openUrl;
    private waitForElements;
    private completeRender;
    setupPage(index: number, url: UrlOrUrlWithContext): Observable<{
        timeRange: string | null;
        elementsPositionAndAttributes: ElementsPositionAndAttribute[] | null;
        renderErrors: string[] | undefined;
    }>;
    /**
     * Given a title and time range value look like:
     *
     * "[Logs] Web Traffic - Apr 14, 2022 @ 120742.318 to Apr 21, 2022 @ 120742.318"
     *
     * Otherwise closest thing to that or a blank string.
     */
    private getTitle;
    private shouldCapturePdf;
    getScreenshots(): (withRenderComplete: Observable<PageSetupResults>) => Observable<ScreenshotObservableResult>;
    checkPageIsOpen(): void;
}
export {};
