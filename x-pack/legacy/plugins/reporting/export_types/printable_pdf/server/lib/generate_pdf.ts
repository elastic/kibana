/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { toArray, mergeMap } from 'rxjs/operators';
import moment from 'moment-timezone';
import { groupBy } from 'lodash';
import { LevelLogger } from '../../../../server/lib';
import { KbnServer, ConditionalHeaders } from '../../../../types';
// @ts-ignore untyped module
import { pdf } from './pdf';
import { oncePerServer } from '../../../../server/lib/once_per_server';
import { screenshotsObservableFactory } from '../../../common/lib/screenshots';
import { createLayout } from '../../../common/layouts';
import { TimeRange } from '../../../common/lib/screenshots/types';
import { LayoutInstance, LayoutParams } from '../../../common/layouts/layout';

interface ScreenshotData {
  base64EncodedData: string;
  title: string;
  description: string;
}

interface UrlScreenshot {
  screenshots: ScreenshotData[];
  timeRange: TimeRange;
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
  const screenshotsObservable = screenshotsObservableFactory(server);
  const captureConcurrency = 1;

  return function generatePdfObservable(
    logger: LevelLogger,
    title: string,
    urls: string[],
    browserTimezone: string,
    conditionalHeaders: ConditionalHeaders,
    layoutParams: LayoutParams,
    logo: string
  ) {
    const layout = createLayout(server, layoutParams) as LayoutInstance;

    const screenshots$ = Rx.from(urls).pipe(
      mergeMap(
        url => screenshotsObservable({ logger, url, conditionalHeaders, layout, browserTimezone }),
        captureConcurrency
      )
    );

    return screenshots$.pipe(
      toArray(),
      mergeMap(async (urlScreenshots: UrlScreenshot[]) => {
        const pdfOutput = pdf.create(layout, logo);

        if (title) {
          const timeRange = getTimeRange(urlScreenshots);
          title += timeRange
            ? ` — ${formatDate(timeRange.from, browserTimezone)} to ${formatDate(
                timeRange.to,
                browserTimezone
              )}`
            : '';
          pdfOutput.setTitle(title);
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
        const buffer = await pdfOutput.getBuffer();
        return buffer;
      })
    );
  };
}

export const generatePdfObservableFactory = oncePerServer(generatePdfObservableFn);
