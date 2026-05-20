import type { CustomPageSize } from 'pdfmake/interfaces';
import type { LayoutSelectorDictionary, Size } from '../../common/layout';
import type { Layout } from '.';
import { BaseLayout } from './base_layout';
import type { PageSizeParams, PdfImageSize } from './base_layout';
export declare class PreserveLayout extends BaseLayout implements Layout {
    readonly selectors: LayoutSelectorDictionary;
    readonly height: number;
    readonly width: number;
    private readonly zoom;
    private readonly scaledHeight;
    private readonly scaledWidth;
    private imageSize;
    constructor(size: Size, selectors?: Partial<LayoutSelectorDictionary>);
    getCssOverridesPath(): string;
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
    getPdfPageOrientation(): undefined;
    getPdfPageSize(pageSizeParams: PageSizeParams): CustomPageSize;
}
