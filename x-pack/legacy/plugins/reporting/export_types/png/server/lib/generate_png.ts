/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { toArray, mergeMap } from 'rxjs/operators';
import { LevelLogger } from '../../../../server/lib';
import { KbnServer, ConditionalHeaders } from '../../../../types';
import { oncePerServer } from '../../../../server/lib/once_per_server';
import { screenshotsObservableFactory } from '../../../common/lib/screenshots';
import { PreserveLayout } from '../../../common/layouts/preserve_layout';
import { LayoutParams } from '../../../common/layouts/layout';

interface ScreenshotData {
  base64EncodedData: string;
}

interface UrlScreenshot {
  screenshots: ScreenshotData[];
}

function generatePngObservableFn(server: KbnServer) {
  const screenshotsObservable = screenshotsObservableFactory(server);
  const captureConcurrency = 1;

  // prettier-ignore
  const createPngWithScreenshots = async ({ urlScreenshots }: { urlScreenshots: UrlScreenshot[] }) => {
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
  };

  return function generatePngObservable(
    logger: LevelLogger,
    url: string,
    browserTimezone: string,
    conditionalHeaders: ConditionalHeaders,
    layoutParams: LayoutParams
  ) {
    if (!layoutParams || !layoutParams.dimensions) {
      throw new Error(`LayoutParams.Dimensions is undefined.`);
    }

    const layout = new PreserveLayout(layoutParams.dimensions);
    const screenshots$ = Rx.of(url).pipe(
      mergeMap(
        iUrl =>
          screenshotsObservable({ logger, url: iUrl, conditionalHeaders, layout, browserTimezone }),
        (jUrl: string, screenshot: UrlScreenshot) => screenshot,
        captureConcurrency
      )
    );

    return screenshots$.pipe(
      toArray(),
      mergeMap(urlScreenshots => createPngWithScreenshots({ urlScreenshots }))
    );
  };
}

export const generatePngObservableFactory = oncePerServer(generatePngObservableFn);
