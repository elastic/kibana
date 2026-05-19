import type { PackageInfo } from '@kbn/core/server';
import type { Layout } from '../../../layouts';
import type { CaptureResult } from '../../../screenshots';
import type { EventLogger } from '../../../screenshots/event_logger';
interface PngsToPdfArgs {
    results: CaptureResult['results'];
    layout: Layout;
    packageInfo: PackageInfo;
    eventLogger: EventLogger;
    logo?: string;
    title?: string;
}
export declare function pngsToPdf({ results, layout, logo, title, packageInfo, eventLogger, }: PngsToPdfArgs): Promise<{
    buffer: Buffer;
    pages: number;
}>;
export {};
