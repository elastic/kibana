/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { map } from 'rxjs/operators';
import { LevelLogger } from '../../../../server/lib';
import { ServerFacade, HeadlessChromiumDriverFactory, ConditionalHeaders } from '../../../../types';
import { screenshotsObservableFactory } from '../../../common/lib/screenshots';
import { PreserveLayout } from '../../../common/layouts/preserve_layout';
import { LayoutParams } from '../../../common/layouts/layout';

export function generatePngObservableFactory(
  server: ServerFacade,
  browserDriverFactory: HeadlessChromiumDriverFactory
) {
  const screenshotsObservable = screenshotsObservableFactory(server, browserDriverFactory);

  return function generatePngObservable(
    logger: LevelLogger,
    url: string,
    browserTimezone: string,
    conditionalHeaders: ConditionalHeaders,
    layoutParams: LayoutParams
  ): Rx.Observable<Buffer> {
    if (!layoutParams || !layoutParams.dimensions) {
      throw new Error(`LayoutParams.Dimensions is undefined.`);
    }

    const layout = new PreserveLayout(layoutParams.dimensions);
    const screenshots$ = screenshotsObservable({
      logger,
      url,
      conditionalHeaders,
      layout,
      browserTimezone,
    }).pipe(
      map(urlScreenshots => {
        if (urlScreenshots.screenshots.length !== 1) {
          throw new Error(
            `Expected there to be 1 screenshot, but there are ${urlScreenshots.screenshots.length}`
          );
        }

        return urlScreenshots.screenshots[0].base64EncodedData;
      })
    );

    return screenshots$;
  };
}
