import type { PackageInfo } from '@kbn/core/server';
import type { LayoutParams, LayoutType } from '../../../common';
import type { Layout } from '../../layouts';
import type { CaptureMetrics, CaptureOptions, CaptureResult } from '../../screenshots';
import type { EventLogger } from '../../screenshots/event_logger';
/**
 * PDFs can be a single, long page or they can be multiple pages. For example:
 *
 * => When creating a PDF intended for print multiple PNGs will be spread out across pages
 * => When creating a PDF from a Canvas workpad, each page in the workpad will be placed on a separate page
 */
export type PdfLayoutParams = LayoutParams<LayoutType>;
/**
 * Options that should be provided to a PDF screenshot request.
 */
export interface PdfScreenshotOptions extends CaptureOptions {
    /**
     * Whether to format the output as a PDF.
     */
    format: 'pdf';
    /**
     * Document title.
     */
    title?: string;
    /**
     * Logo at the footer.
     */
    logo?: string;
    /**
     * We default to the "print" layout if no ID is specified for the layout
     */
    layout?: PdfLayoutParams;
}
export type PdfScreenshotMetrics = Partial<CaptureMetrics>;
/**
 * Final, formatted PDF result
 */
export interface PdfScreenshotResult {
    /**
     * Collected performance metrics during the screenshotting session along with the PDF generation ones.
     */
    metrics: PdfScreenshotMetrics;
    /**
     * PDF document data buffer.
     */
    data: Buffer;
    /**
     * Any errors that were encountered while create the PDF and navigating between pages
     */
    errors: Error[];
    /**
     * Any render errors that could mean some visualizations are missing from the end result.
     */
    renderErrors: string[];
}
export declare function toPdf(eventLogger: EventLogger, packageInfo: PackageInfo, layout: Layout, { logo, title }: PdfScreenshotOptions, { metrics, results }: CaptureResult): Promise<PdfScreenshotResult>;
