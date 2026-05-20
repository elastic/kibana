import type { CustomPageSize, PredefinedPageSize } from 'pdfmake/interfaces';
import type { LayoutType, Size } from '../../common/layout';
export interface ViewZoomWidthHeight {
    zoom: number;
    width: number;
    height: number;
}
export interface PdfImageSize {
    width: number;
    height: number;
}
export interface PageSizeParams {
    pageMarginTop: number;
    pageMarginBottom: number;
    pageMarginWidth: number;
    tableBorderWidth: number;
    headingHeight: number;
    subheadingHeight: number;
}
export declare abstract class BaseLayout {
    id: LayoutType;
    hasHeader: boolean;
    hasFooter: boolean;
    useReportingBranding: boolean;
    constructor(id: LayoutType);
    abstract getPdfImageSize(): PdfImageSize;
    abstract setPdfImageSize({ height, width }: PdfImageSize): void;
    abstract getPdfPageOrientation(): 'portrait' | 'landscape' | undefined;
    abstract getPdfPageSize(pageSizeParams: PageSizeParams): CustomPageSize | PredefinedPageSize;
    /**
     * Return the unscaled dimensions (before multiplying the zoom factor)
     *
     * `itemsCount` is only needed for the `print` layout implementation, where the number of items to capture
     * affects the viewport size
     *
     * @param {number} [itemsCount=1] - The number of items to capture. Default is 1.
     * @returns ViewZoomWidthHeight - Viewport data
     */
    abstract getViewport(itemsCount?: number): ViewZoomWidthHeight | null;
    abstract getBrowserZoom(): number;
    abstract getBrowserViewport(): Size;
    abstract getCssOverridesPath(): string | undefined;
}
