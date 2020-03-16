/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { groupBy } from 'lodash';
import * as Rx from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { LevelLogger } from '../../../../server/lib';
import { ConditionalHeaders, HeadlessChromiumDriverFactory, ServerFacade } from '../../../../types';
import { createLayout } from '../../../common/layouts';
import { LayoutInstance, LayoutParams } from '../../../common/layouts/layout';
import { screenshotsObservableFactory } from '../../../common/lib/screenshots';
import { ScreenshotResults } from '../../../common/lib/screenshots/types';
import { getTracker } from './tracker';
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
    const tracker = getTracker();
    tracker.startLayout();

    const layout = createLayout(server, layoutParams) as LayoutInstance;
    tracker.endLayout();

    tracker.startScreenshots();
    const screenshots$ = screenshotsObservable({
      logger,
      urls,
      conditionalHeaders,
      layout,
      browserTimezone,
    }).pipe(
      mergeMap(async (results: ScreenshotResults[]) => {
        tracker.endScreenshots();

        tracker.startSetup();
        const pdfOutput = pdf.create(layout, logo);
        if (title) {
          const timeRange = getTimeRange(results);
          title += timeRange ? ` - ${timeRange.duration}` : '';
          pdfOutput.setTitle(title);
        }
        tracker.endSetup();

        results.forEach(r => {
          r.screenshots.forEach(screenshot => {
            logger.debug(
              `Adding image to PDF. Image base64 size: ${screenshot.base64EncodedData?.length || 0}`
            ); // prettier-ignore
            tracker.startAddImage();
            tracker.endAddImage();
            pdfOutput.addImage(screenshot.base64EncodedData, {
              title: screenshot.title,
              description: screenshot.description,
            });
          });
        });

        let buffer: Buffer | null = null;
        try {
          tracker.startCompile();
          logger.debug(`Compiling PDF...`);
          pdfOutput.generate();
          tracker.endCompile();

          tracker.startGetBuffer();
          logger.debug(`Generating PDF Buffer...`);
          buffer = await pdfOutput.getBuffer();
          logger.debug(`PDF buffer byte length: ${buffer?.byteLength || 0}`);
          tracker.endGetBuffer();
        } catch (err) {
          logger.error(`Could not generate the PDF buffer! ${err}`);
        }

        tracker.end();

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

    return screenshots$;
  };
}
