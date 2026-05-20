import type { LayoutSelectorDictionary, Size } from '../../common/layout';
import type { Layout } from '.';
import type { PdfImageSize } from './base_layout';
import { BaseLayout } from './base_layout';
export declare class CanvasLayout extends BaseLayout implements Layout {
    readonly selectors: LayoutSelectorDictionary;
    readonly height: number;
    readonly width: number;
    private readonly scaledHeight;
    private readonly scaledWidth;
    private imageSize;
    hasHeader: boolean;
    hasFooter: boolean;
    useReportingBranding: boolean;
    constructor(size: Size);
    getPdfPageOrientation(): undefined;
    getCssOverridesPath(): undefined;
    getBrowserViewport(): {
        height: number;
        width: number;
    };
    getBrowserZoom(): number;
    getViewport(): {
        height: number;
        width: number;
        zoom: number;
    };
    setPdfImageSize({ height, width }: PdfImageSize): void;
    getPdfImageSize(): PdfImageSize;
    getPdfPageSize(): Size;
}
