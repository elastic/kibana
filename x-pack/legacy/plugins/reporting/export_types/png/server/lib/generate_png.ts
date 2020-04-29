/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { map } from 'rxjs/operators';
import { ReportingCore } from '../../../../server';
import { LevelLogger } from '../../../../server/lib';
import { ConditionalHeaders } from '../../../../types';
import { LayoutParams } from '../../../common/layouts/layout';
import { PreserveLayout } from '../../../common/layouts/preserve_layout';
import { ScreenshotResults } from '../../../common/lib/screenshots/types';

export async function generatePngObservableFactory(reporting: ReportingCore) {
  const getScreenshots = await reporting.getScreenshotsObservable();

  return function generatePngObservable(
    logger: LevelLogger,
    url: string,
    browserTimezone: string,
    conditionalHeaders: ConditionalHeaders,
    layoutParams: LayoutParams
  ): Rx.Observable<{ buffer: Buffer; warnings: string[] }> {
    if (!layoutParams || !layoutParams.dimensions) {
      throw new Error(`LayoutParams.Dimensions is undefined.`);
    }

    const layout = new PreserveLayout(layoutParams.dimensions);
    const screenshots$ = getScreenshots({
      logger,
      urls: [url],
      conditionalHeaders,
      layout,
      browserTimezone,
    }).pipe(
      map((results: ScreenshotResults[]) => {
        return {
          buffer: results[0].screenshots[0].base64EncodedData,
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
