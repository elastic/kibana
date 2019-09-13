/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { concatMap, toArray, first } from 'rxjs/operators';
import moment from 'moment-timezone';
import { groupBy } from 'lodash';
import { LevelLogger } from '../../../../server/lib';
import { KbnServer, ConditionalHeaders } from '../../../../types';
import { HeadlessChromiumDriverFactory } from '../../../../server/browsers/chromium/driver_factory';
import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers/chromium/driver';
import { oncePerServer } from '../../../../server/lib/once_per_server';
import { screenshotsFactory } from '../../../common/lib/screenshots';
import { createLayout } from '../../../common/layouts';
import { TimeRange } from '../../../common/lib/screenshots/types';
import { LayoutInstance, LayoutParams } from '../../../common/layouts/layout';
// @ts-ignore untyped module
import { pdf } from './pdf';

interface ScreenshotData {
  base64EncodedData: string;
  title: string;
  description: string;
}

interface UrlScreenshot {
  screenshots: ScreenshotData[];
  timeRange: TimeRange;
}

interface PdfMaker {
  setTitle: (title: string) => void;
  addImage: (base64EncodedData: string, options: { title: string; description: string }) => void;
  generate: () => void;
  getBuffer: () => Promise<Buffer>;
}

const getTimeRange = (urlScreenshots: UrlScreenshot[]) => {
  const grouped = groupBy(urlScreenshots.map(u => u.timeRange));
  const values = Object.values(grouped);
  if (values.length === 1) {
    return values[0][0];
  }

  return null;
};

const formatDate = (date: Date, timezone: string) => {
  return moment.tz(date, timezone).format('llll');
};

function generatePdfObservableFn(server: KbnServer) {
  const getScreenshots = screenshotsFactory(server);
  const browserDriverFactory: HeadlessChromiumDriverFactory = server.plugins.reporting.browserDriverFactory; // prettier-ignore

  // NOTE: there doesn't seem to be real type-checking on the `Observable<Buffer>` return type defined for this fn
  return function generatePdfObservable(
    logger: LevelLogger,
    title: string,
    urls: string[],
    browserTimezone: string,
    conditionalHeaders: ConditionalHeaders,
    layoutParams: LayoutParams,
    logo: string
  ): Rx.Observable<Buffer> {
    const layout = createLayout(server, layoutParams) as LayoutInstance;
    const create$ = browserDriverFactory.create({
      viewport: layout.getBrowserViewport(),
      browserTimezone,
    });

    return Rx.from(urls).pipe(
      concatMap((url: string) => {
        return create$.pipe(
          concatMap(({ driver$ }) => {
            return driver$.pipe(
              concatMap((browser: HeadlessBrowser) => {
                return getScreenshots({
                  browser,
                  logger,
                  url,
                  conditionalHeaders,
                  layout,
                  browserTimezone,
                });
              })
            );
          }),
          first()
        );
      }),
      toArray(), // emit all screenshot emissions as an array
      concatMap((urlScreenshots: UrlScreenshot[]) => {
        const pdfOutput: PdfMaker = pdf.create(layout, logo);

        if (title) {
          let pdfTitle: string;
          const timeRange = getTimeRange(urlScreenshots);
          if (timeRange) {
            pdfTitle = `${title} — ${formatDate(timeRange.from, browserTimezone)} to ${formatDate(timeRange.to, browserTimezone)}`; // prettier-ignore
          } else {
            pdfTitle = title;
          }
          pdfOutput.setTitle(pdfTitle);
        }

        urlScreenshots.forEach(({ screenshots }) => {
          screenshots.forEach(screenshot => {
            pdfOutput.addImage(screenshot.base64EncodedData, {
              title: screenshot.title,
              description: screenshot.description,
            });
          });
        });

        pdfOutput.generate();
        return pdfOutput.getBuffer();
      })
    );
  };
}

export const generatePdfObservableFactory = oncePerServer(generatePdfObservableFn);
