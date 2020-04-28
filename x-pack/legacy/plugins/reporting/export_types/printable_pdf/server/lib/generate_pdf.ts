/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { groupBy } from 'lodash';
import * as Rx from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { ReportingCore } from '../../../../server';
import { LevelLogger } from '../../../../server/lib';
import { ConditionalHeaders } from '../../../../types';
import { createLayout } from '../../../common/layouts';
import { LayoutInstance, LayoutParams } from '../../../common/layouts/layout';
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

export async function generatePdfObservableFactory(reporting: ReportingCore) {
  const config = reporting.getConfig();
  const captureConfig = config.get('capture');
  const getScreenshots = await reporting.getScreenshotsObservable();

  return function generatePdfObservable(
    logger: LevelLogger,
    title: string,
    urls: string[],
    browserTimezone: string,
    conditionalHeaders: ConditionalHeaders,
    layoutParams: LayoutParams,
    logo?: string
  ): Rx.Observable<{ buffer: Buffer; warnings: string[] }> {
    const layout = createLayout(captureConfig, layoutParams) as LayoutInstance;
    const screenshots$ = getScreenshots({
      logger,
      urls,
      conditionalHeaders,
      layout,
      browserTimezone,
    }).pipe(
      mergeMap(async (results: ScreenshotResults[]) => {
        const pdfOutput = pdf.create(layout, logo);

        if (title) {
          const timeRange = getTimeRange(results);
          title += timeRange ? ` - ${timeRange.duration}` : '';
          pdfOutput.setTitle(title);
        }

        results.forEach(r => {
          r.screenshots.forEach(screenshot => {
            pdfOutput.addImage(screenshot.base64EncodedData, {
              title: screenshot.title,
              description: screenshot.description,
            });
          });
        });

        pdfOutput.generate();

        return {
          buffer: await pdfOutput.getBuffer(),
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
