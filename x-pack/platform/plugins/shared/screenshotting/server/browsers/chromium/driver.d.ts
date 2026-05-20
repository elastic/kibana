import type { Headers, Logger } from '@kbn/core/server';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/server';
import type { ConfigType } from '@kbn/screenshotting-server';
import type { CDPSession } from 'puppeteer';
import type { ElementHandle, EvaluateFunc, Page } from 'puppeteer';
import type { Layout } from '../../layouts';
declare module 'puppeteer' {
    interface Page {
        _client(): CDPSession;
    }
    interface Target {
        _targetId: string;
    }
}
export type Context = Record<string, unknown>;
export interface ElementPosition {
    boundingClientRect: {
        top: number;
        left: number;
        width: number;
        height: number;
    };
    scroll: {
        x: number;
        y: number;
    };
}
interface OpenOptions {
    context?: Context;
    headers: Headers;
    waitForSelector: string;
    timeout: number;
}
interface WaitForSelectorOpts {
    timeout: number;
}
interface EvaluateOpts<A extends unknown[]> {
    fn: EvaluateFunc<A>;
    args: unknown[];
}
interface EvaluateMetaOpts {
    context: string;
}
/**
 * @internal
 */
export declare class HeadlessChromiumDriver {
    private screenshotMode;
    private config;
    private basePath;
    private readonly page;
    private listenersAttached;
    private interceptedCount;
    private screenshottingErrorSubject;
    readonly screenshottingError$: import("rxjs").Observable<Error>;
    constructor(screenshotMode: ScreenshotModePluginSetup, config: ConfigType, basePath: string, page: Page);
    private allowRequest;
    private truncateUrl;
    open(url: string, { headers, context, waitForSelector: pageLoadSelector, timeout }: OpenOptions, logger: Logger): Promise<void>;
    isPageOpen(): boolean;
    /**
     * Despite having "preserveDrawingBuffer": "true" for WebGL driven canvas elements
     * we may still get a blank canvas in PDFs. As a further mitigation
     * we convert WebGL backed canvases to images and inline replace the canvas element.
     * The visual result is identical.
     *
     * The drawback is that we are mutating the page and so if anything were to interact
     * with it after we ran this function it may lead to issues. Ideally, once Chromium
     * fixes how PDFs are generated we can remove this code. See:
     *
     * https://bugs.chromium.org/p/chromium/issues/detail?id=809065
     * https://bugs.chromium.org/p/chromium/issues/detail?id=137576
     *
     * Idea adapted from: https://github.com/puppeteer/puppeteer/issues/1731#issuecomment-864345938
     */
    private workaroundWebGLDrivenCanvases;
    /**
     * Timeout errors may occur when waiting for data or the brower render events to complete. This mutates the
     * page, and has the drawback anything were to interact with the page after we ran this function, it may lead
     * to issues. Ideally, timeout errors wouldn't occur because ES would return pre-loaded results data
     * statically.
     */
    private injectScreenshottingErrorHeader;
    printA4Pdf({ title, logo, error, }: {
        title: string;
        logo?: string;
        error?: Error;
    }): Promise<Buffer>;
    screenshot({ elementPosition, layout, error, }: {
        elementPosition: ElementPosition;
        layout: Layout;
        error?: Error;
    }): Promise<Buffer | undefined>;
    evaluate<A extends unknown[], T = void>({ fn, args }: EvaluateOpts<A>, meta: EvaluateMetaOpts, logger: Logger): Promise<T>;
    waitForSelector(selector: string, opts: WaitForSelectorOpts, context: EvaluateMetaOpts, logger: Logger): Promise<ElementHandle<Element>>;
    waitFor<T extends unknown[] = unknown[]>({ fn, args, timeout, }: {
        fn: EvaluateFunc<T>;
        args: unknown[];
        timeout: number;
    }): Promise<void>;
    /**
     * Setting the viewport is required to ensure that all capture elements are visible: anything not in the
     * viewport can not be captured.
     */
    setViewport({ width: _width, height: _height, zoom }: {
        zoom: number;
        width: number;
        height: number;
    }, logger: Logger): Promise<void>;
    private registerListeners;
    private _shouldUseCustomHeaders;
}
export {};
