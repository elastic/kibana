/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { toArray, mergeMap, tap } from 'rxjs/operators';
import { LevelLogger } from '../../../../server/lib';
import { ServerFacade, ConditionalHeaders } from '../../../../types';
import { screenshotsObservableFactory } from '../../../common/lib/screenshots';
import { PreserveLayout } from '../../../common/layouts/preserve_layout';
import { LayoutParams } from '../../../common/layouts/layout';

interface ScreenshotData {
  base64EncodedData: string;
}

interface UrlScreenshot {
  screenshots: ScreenshotData[];
}

export function generatePngObservableFactory(server: ServerFacade) {
  const screenshotsObservable = screenshotsObservableFactory(server);
  const captureConcurrency = 1;

  return function generatePngObservable(
    logger: LevelLogger,
    url: string,
    browserTimezone: string,
    conditionalHeaders: ConditionalHeaders,
    layoutParams: LayoutParams
  ): Rx.Observable<string> {
    if (!layoutParams || !layoutParams.dimensions) {
      throw new Error(`LayoutParams.Dimensions is undefined.`);
    }

    const layout = new PreserveLayout(layoutParams.dimensions);

    return Rx.of(url).pipe(
      mergeMap(iUrl => screenshotsObservable({ logger, url: iUrl, conditionalHeaders, layout, browserTimezone })), // prettier-ignore
      tap((something) => {
        console.log('help me');
        console.log(JSON.stringify(something));
      }),
      toArray(),
      tap((something) => {
        console.log('help me 2');
        console.log(JSON.stringify(something));
      }),
      mergeMap(urlScreenshots => {
        if (urlScreenshots.length !== 1) {
          throw new Error(
            `Expected there to be 1 URL screenshot, but there are ${urlScreenshots.length}`
          );
        }
        if (urlScreenshots[0].screenshots.length !== 1) {
          throw new Error(
            `Expected there to be 1 screenshot, but there are ${urlScreenshots[0].screenshots.length}`
          );
        }

        return urlScreenshots[0].screenshots[0].base64EncodedData;
      })
    );
  };
}
