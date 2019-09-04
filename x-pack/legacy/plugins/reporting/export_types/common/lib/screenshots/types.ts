/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElementPosition, ConditionalHeaders } from '../../../../types';
import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers/chromium/driver';
import { LevelLogger } from '../../../../server/lib';
import { LayoutInstance } from '../../layouts/layout';

export interface ScreenshotObservableOpts {
  logger: LevelLogger;
  url: string;
  conditionalHeaders: ConditionalHeaders;
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
