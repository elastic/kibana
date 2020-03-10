/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import apm from 'elastic-apm-node';
import { groupBy } from 'lodash';
import * as Rx from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { LevelLogger } from '../../../../server/lib';
import { ConditionalHeaders, HeadlessChromiumDriverFactory, ServerFacade } from '../../../../types';
import { createLayout } from '../../../common/layouts';
import { LayoutInstance, LayoutParams } from '../../../common/layouts/layout';
import { screenshotsObservableFactory } from '../../../common/lib/screenshots';
import { ScreenshotResults } from '../../../common/lib/screenshots/types';
// @ts-ignore untyped module
import { pdf } from './pdf';

const getTimeRange = (urlScreenshots: ScreenshotResults[]) => {
  const grouped = groupBy(urlScreenshots.map(u => u.timeRange));
  const values = Object.values(grouped);
  if (values.length === 1) {
    return values[0][0];
  }

  return null;
};

export function generatePdfObservableFactory(
  server: ServerFacade,
  browserDriverFactory: HeadlessChromiumDriverFactory
) {
  const screenshotsObservable = screenshotsObservableFactory(server, browserDriverFactory);

  return function generatePdfObservable(
    logger: LevelLogger,
    title: string,
    urls: string[],
    browserTimezone: string,
    conditionalHeaders: ConditionalHeaders,
    layoutParams: LayoutParams,
    logo?: string
  ): Rx.Observable<{ buffer: Buffer | null; warnings: string[] }> {
    const apmTrans = apm.startTransaction('reporting generate_pdf', 'reporting');
    const apmLayout = apmTrans?.startSpan('create_layout', 'setup');

    const layout = createLayout(server, layoutParams) as LayoutInstance;
    if (apmLayout) apmLayout.end();

    const apmScreenshots = apmTrans?.startSpan('screenshots_pipeline', 'setup');
    const screenshots$ = screenshotsObservable({
      logger,
      urls,
      conditionalHeaders,
      layout,
      browserTimezone,
    }).pipe(
      mergeMap(async (results: ScreenshotResults[]) => {
        if (apmScreenshots) apmScreenshots.end();

        const apmSetup = apmTrans?.startSpan('setup_pdf', 'setup');
        const pdfOutput = pdf.create(layout, logo);
        if (title) {
          const timeRange = getTimeRange(results);
          title += timeRange ? ` - ${timeRange.duration}` : '';
          pdfOutput.setTitle(title);
        }
        if (apmSetup) apmSetup.end();

        results.forEach(r => {
          r.screenshots.forEach(screenshot => {
            logger.debug(
              `Adding image to PDF. Image base64 size: ${screenshot.base64EncodedData?.length || 0}`
            ); // prettier-ignore
            const apmAddImage = apmTrans?.startSpan('add_pdf_image', 'output');
            pdfOutput.addImage(screenshot.base64EncodedData, {
              title: screenshot.title,
              description: screenshot.description,
            });
            if (apmAddImage) apmAddImage.end();
          });
        });

        let buffer: Buffer | null = null;
        try {
          const apmCompilePdf = apmTrans?.startSpan('compile_pdf', 'output');
          logger.debug(`Compiling PDF...`);
          pdfOutput.generate();
          if (apmCompilePdf) apmCompilePdf.end();

          const apmGetBuffer = apmTrans?.startSpan('get_buffer', 'output');
          logger.debug(`Generating PDF Buffer...`);
          buffer = await pdfOutput.getBuffer();
          logger.debug(`PDF buffer byte length: ${buffer?.byteLength || 0}`);
          if (apmGetBuffer) apmGetBuffer.end();
        } catch (err) {
          apm.captureError(err);
          logger.error(`Could not generate the PDF buffer! ${err}`);
        }

        return {
          buffer,
          warnings: results.reduce((found, current) => {
            if (current.error) {
              found.push(current.error.message);
            }
            return found;
          }, [] as string[]),
        };
      })
    );

    if (apmTrans) apmTrans.end();
    return screenshots$;
  };
}
