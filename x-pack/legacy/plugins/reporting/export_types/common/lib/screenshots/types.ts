/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { ElementPosition } from '../../../../types';
import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers/chromium/driver';
import { LayoutInstance } from '../../layouts/layout';

export interface ScreenshotObservableOpts {
  browserDriver$: {
    driver$: Rx.Observable<HeadlessBrowser>;
    consoleMessage$: Rx.Observable<string>;
    message$: Rx.Observable<string>;
    exit$: Rx.Observable<never>;
  };
  url: string;
  conditionalHeaders: any;
  layout: LayoutInstance;
  browserTimezone: string;
}

export interface TimeRange {
  from: any;
  to: any;
}

export interface AttributesMap {
  [key: string]: any;
}

export interface ElementsPositionAndAttribute {
  position: ElementPosition;
  attributes: AttributesMap;
}

export interface Screenshot {
  base64EncodedData: any;
  title: any;
  description: any;
}

export interface ScreenShotOpts {
  elementsPositionAndAttributes: ElementsPositionAndAttribute[];
}

export interface BrowserOpts {
  browser: HeadlessBrowser;
}

export interface TimeRangeOpts {
  timeRange: TimeRange;
}
