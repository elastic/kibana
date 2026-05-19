import type { Observable } from 'rxjs';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { HttpServiceSetup, Logger, PackageInfo } from '@kbn/core/server';
import type { ConfigType } from '@kbn/screenshotting-server';
import type { ScreenshotOptions, ScreenshotResult } from '.';
import type { HeadlessChromiumDriverFactory } from '../browsers';
import type { PdfScreenshotOptions, PdfScreenshotResult, PngScreenshotOptions, PngScreenshotResult } from '../formats';
export declare class Screenshots {
    private readonly browserDriverFactory;
    private readonly logger;
    private readonly packageInfo;
    private readonly http;
    private readonly config;
    private readonly cloud?;
    private semaphore;
    constructor(browserDriverFactory: HeadlessChromiumDriverFactory, logger: Logger, packageInfo: PackageInfo, http: HttpServiceSetup, config: ConfigType, cloud?: CloudSetup | undefined);
    private captureScreenshots;
    private getScreenshottingAppUrl;
    private getCaptureOptions;
    systemHasInsufficientMemory(): boolean;
    getScreenshots(options: PngScreenshotOptions): Observable<PngScreenshotResult>;
    getScreenshots(options: PdfScreenshotOptions): Observable<PdfScreenshotResult>;
    getScreenshots(options: ScreenshotOptions): Observable<ScreenshotResult>;
}
