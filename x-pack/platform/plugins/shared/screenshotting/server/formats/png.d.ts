import type { CaptureResult, CaptureOptions } from '../screenshots';
import type { LayoutParams } from '../../common';
/**
 * The layout parameters that are accepted by PNG screenshots
 */
export type PngLayoutParams = LayoutParams<'preserve_layout'>;
/**
 * Options that should be provided to a screenshot PNG request
 */
export interface PngScreenshotOptions extends CaptureOptions {
    /**
     * Whether to format the output as a PNG.
     * @default 'png'
     */
    format?: 'png';
    layout?: PngLayoutParams;
}
/**
 * The final output of a PNG screenshot
 */
export type PngScreenshotResult = CaptureResult;
export declare function toPng(result: CaptureResult): Promise<PngScreenshotResult>;
