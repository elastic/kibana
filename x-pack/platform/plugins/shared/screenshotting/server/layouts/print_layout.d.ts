import type { PageOrientation, PredefinedPageSize } from 'pdfmake/interfaces';
import type { Layout } from '.';
import type { LayoutParams, LayoutSelectorDictionary } from '../../common/layout';
import type { PdfImageSize } from './base_layout';
import { BaseLayout } from './base_layout';
export declare const getPrintLayoutSelectors: () => LayoutSelectorDictionary;
export declare class PrintLayout extends BaseLayout implements Layout {
    readonly selectors: LayoutSelectorDictionary;
    private readonly viewport;
    private zoom;
    constructor({ zoom }: Pick<LayoutParams, 'zoom'>);
    getCssOverridesPath(): undefined;
    getBrowserViewport(): Required<Pick<import("puppeteer-core").Viewport, "deviceScaleFactor" | "height" | "width">>;
    getBrowserZoom(): number;
    getViewport(itemsCount?: number): {
        zoom: number;
        width: number;
        height: number;
    };
    getPdfImageSize(): PdfImageSize;
    setPdfImageSize({ height, width }: PdfImageSize): void;
    getPdfPageOrientation(): PageOrientation;
    getPdfPageSize(): PredefinedPageSize;
}
