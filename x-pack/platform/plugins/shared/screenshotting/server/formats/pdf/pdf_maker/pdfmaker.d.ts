import type { Logger, PackageInfo } from '@kbn/core/server';
import type { ContentImage } from 'pdfmake/interfaces';
import type { Layout } from '../../../layouts';
import './worker_dependencies';
export declare class PdfMaker {
    private readonly layout;
    private readonly logo;
    private readonly logger;
    private title;
    private content;
    private worker?;
    private workerLogger;
    private pageCount;
    private transferList;
    protected workerModulePath: string;
    /**
     * The maximum heap size for old memory region of the worker thread.
     *
     * @note We need to provide a sane number given that we need to load a
     * node environment for TS compilation (dev-builds only), some library code
     * and buffers that result from generating a PDF.
     *
     * Local testing indicates that to trigger an OOM event for the worker we need
     * to exhaust not only heap but also any compression optimization and fallback
     * swap space.
     *
     * With this value we are able to generate PDFs in excess of 5000x5000 pixels
     * at which point issues other than memory start to show like glitches in the
     * image.
     */
    protected workerMaxOldHeapSizeMb: number;
    /**
     * The maximum heap size for young memory region of the worker thread.
     *
     * @note we leave this 'undefined' to use the Node.js default value.
     * @note we set this to a low value to trigger an OOM event sooner for the worker
     * in test scenarios.
     */
    protected workerMaxYoungHeapSizeMb: number | undefined;
    constructor(layout: Layout, logo: string | undefined, { dist }: PackageInfo, logger: Logger);
    private addPageContents;
    addBrandedImage(img: ContentImage, { title, description }: {
        title?: string | undefined;
        description?: string | undefined;
    }): void;
    addImage(image: Buffer, opts?: {
        title?: string;
        description?: string;
    }): void;
    setTitle(title: string): void;
    private getGeneratePdfRequestData;
    private createWorker;
    private cleanupWorker;
    generate(): Promise<Uint8Array>;
    getPageCount(): number;
}
