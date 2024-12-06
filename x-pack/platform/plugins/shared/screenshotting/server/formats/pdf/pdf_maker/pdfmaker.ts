/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, PackageInfo } from '@kbn/core/server';
import { SerializableRecord } from '@kbn/utility-types';
import path from 'path';
import { Content, ContentImage, ContentText } from 'pdfmake/interfaces';
import { MessageChannel, MessagePort, Worker } from 'worker_threads';
import type { Layout } from '../../../layouts';
import { errors } from '../../../../common';
import {
  headingHeight,
  pageMarginBottom,
  pageMarginTop,
  pageMarginWidth,
  subheadingHeight,
  tableBorderWidth,
} from './constants';
import { REPORTING_TABLE_LAYOUT } from './get_doc_options';
import { getFont } from './get_font';
import {
  GeneratePdfResponseType,
  type GeneratePdfRequest,
  type WorkerData,
  GeneratePdfResponse,
} from './worker';

// Ensure that all dependencies are included in the release bundle.
import './worker_dependencies';

export class PdfMaker {
  private title: string;
  private content: Content[];

  private worker?: Worker;
  private workerLogger: Logger;

  private pageCount: number = 0;
  private transferList: ArrayBuffer[] = [];

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
  protected workerMaxOldHeapSizeMb = 128;

  /**
   * The maximum heap size for young memory region of the worker thread.
   *
   * @note we leave this 'undefined' to use the Node.js default value.
   * @note we set this to a low value to trigger an OOM event sooner for the worker
   * in test scenarios.
   */
  protected workerMaxYoungHeapSizeMb: number | undefined = undefined;

  constructor(
    private readonly layout: Layout,
    private readonly logo: string | undefined,
    { dist }: PackageInfo,
    private readonly logger: Logger
  ) {
    this.title = '';
    this.content = [];
    this.workerLogger = logger.get('pdf-worker');

    // running in dist: `worker.ts` becomes `worker.js`
    // running in source: `worker_src_harness.ts` needs to be wrapped in JS and have a ts-node environment initialized.
    this.workerModulePath = path.resolve(
      __dirname,
      dist ? './worker.js' : './worker_src_harness.js'
    );
  }

  private addPageContents(contents: Content[]) {
    this.content.push(
      // Insert a page break after each content item
      (this.content.length > 1
        ? [
            {
              text: '',
              pageBreak: 'after',
            } as ContentText as Content,
          ]
        : []
      ).concat(contents)
    );
  }

  addBrandedImage(img: ContentImage, { title = '', description = '' }) {
    const contents: Content[] = [];

    if (title && title.length > 0) {
      contents.push({
        text: title,
        style: 'heading',
        font: getFont(title),
        noWrap: false,
      });
    }

    if (description && description.length > 0) {
      contents.push({
        text: description,
        style: 'subheading',
        font: getFont(description),
        noWrap: false,
      });
    }

    const wrappedImg = {
      table: {
        body: [[img]],
      },
      layout: REPORTING_TABLE_LAYOUT,
    };

    contents.push(wrappedImg);

    this.addPageContents(contents);
  }

  addImage(
    image: Buffer,
    opts: { title?: string; description?: string } = { title: '', description: '' }
  ) {
    this.logger.debug(`Adding image to PDF. Image size: ${image.byteLength}`); // prettier-ignore
    const size = this.layout.getPdfImageSize();
    const img = {
      // The typings are incomplete for the image property.
      // It's possible to pass a Buffer as the image data.
      // @see https://github.com/bpampuch/pdfmake/blob/0.2/src/printer.js#L654
      image,
      alignment: 'center' as 'center',
      height: size.height,
      width: size.width,
    } as unknown as ContentImage;
    this.transferList.push(image.buffer);

    if (this.layout.useReportingBranding) {
      return this.addBrandedImage(img, opts);
    }

    this.addPageContents([img]);
  }

  setTitle(title: string) {
    this.title = title;
  }

  private getGeneratePdfRequestData(): GeneratePdfRequest['data'] {
    return {
      layout: {
        hasHeader: this.layout.hasHeader,
        hasFooter: this.layout.hasFooter,
        orientation: this.layout.getPdfPageOrientation(),
        useReportingBranding: this.layout.useReportingBranding,
        pageSize: this.layout.getPdfPageSize({
          pageMarginTop,
          pageMarginBottom,
          pageMarginWidth,
          tableBorderWidth,
          headingHeight,
          subheadingHeight,
        }),
      },
      title: this.title,
      logo: this.logo,
      content: this.content as unknown as SerializableRecord[],
    };
  }

  private createWorker(port: MessagePort): Worker {
    const workerData: WorkerData = {
      port,
    };
    return new Worker(this.workerModulePath, {
      workerData,
      resourceLimits: {
        maxYoungGenerationSizeMb: this.workerMaxYoungHeapSizeMb,
        maxOldGenerationSizeMb: this.workerMaxOldHeapSizeMb,
      },
      transferList: [port],
    });
  }

  private async cleanupWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate().catch(); // best effort
      this.worker = undefined;
    }
  }

  public async generate(): Promise<Uint8Array> {
    if (this.worker) throw new Error('PDF generation already in progress!');

    this.logger.info(`Compiling PDF using "${this.layout.id}" layout...`);

    try {
      return await new Promise<Uint8Array>((resolve, reject) => {
        const { port1: myPort, port2: theirPort } = new MessageChannel();
        this.worker = this.createWorker(theirPort);
        this.worker.on('error', (workerError: NodeJS.ErrnoException) => {
          this.workerLogger.error(`Worker error: ${workerError}`);
          if (workerError.code === 'ERR_WORKER_OUT_OF_MEMORY') {
            reject(new errors.PdfWorkerOutOfMemoryError(workerError.message));
          } else {
            reject(workerError);
          }
        });
        this.worker.on('exit', () => {
          this.workerLogger.debug('Worker exited');
        });

        myPort.on('message', ({ type, error, data, message }: GeneratePdfResponse) => {
          if (type === GeneratePdfResponseType.Log && message) {
            this.workerLogger.debug(message);
            return;
          }

          if (type === GeneratePdfResponseType.Error) {
            reject(new Error(`PDF worker returned the following error: ${error}`));
            return;
          }

          if (type === GeneratePdfResponseType.Data && !data) {
            reject(new Error(`Worker did not generate a PDF!`));
            return;
          }

          if (data) {
            this.pageCount = data.metrics.pages;
            resolve(data.buffer);
          }
        });

        // Send the request
        const generatePdfRequest: GeneratePdfRequest = {
          data: this.getGeneratePdfRequestData(),
        };
        myPort.postMessage(generatePdfRequest, this.transferList);
      });
    } finally {
      await this.cleanupWorker();
    }
  }

  getPageCount(): number {
    return this.pageCount;
  }
}
