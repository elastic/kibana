/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { groupBy } from 'lodash';
import { LevelLogger } from '../../../../server/lib';
import { ServerFacade, HeadlessChromiumDriverFactory, ConditionalHeaders } from '../../../../types';
// @ts-ignore untyped module
import { pdf } from './pdf';
import { screenshotsObservableFactory } from '../../../common/lib/screenshots';
import { createLayout } from '../../../common/layouts';
import { ScreenshotResults } from '../../../common/lib/screenshots/types';
import { LayoutInstance, LayoutParams } from '../../../common/layouts/layout';

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
  ): Rx.Observable<Buffer> {
    const layout = createLayout(server, layoutParams) as LayoutInstance;
    const screenshots$ = screenshotsObservable({
      logger,
      urls,
      conditionalHeaders,
      layout,
      browserTimezone,
    }).pipe(
      mergeMap(async urlScreenshots => {
        const pdfOutput = pdf.create(layout, logo);

        if (title) {
          const timeRange = getTimeRange(urlScreenshots);
          title += timeRange ? ` - ${timeRange.duration}` : '';
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
        return await pdfOutput.getBuffer();
      })
    );

    return screenshots$;
  };
}
