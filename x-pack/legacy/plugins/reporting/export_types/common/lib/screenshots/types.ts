/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LevelLogger } from '../../../../server/lib';
import { ConditionalHeaders, ElementPosition } from '../../../../types';
import { LayoutInstance } from '../../layouts/layout';

export interface ScreenshotObservableOpts {
  logger: LevelLogger;
  urls: string[];
  conditionalHeaders: ConditionalHeaders;
  layout: LayoutInstance;
  browserTimezone: string;
}

export interface TimeRange {
  duration: string;
}

export interface AttributesMap {
  [key: string]: any;
}

export interface ElementsPositionAndAttribute {
  position: ElementPosition;
  attributes: AttributesMap;
}

export interface Screenshot {
  base64EncodedData: Buffer;
  title: string;
  description: string;
}

export interface ScreenSetupData {
  elementsPositionAndAttributes: ElementsPositionAndAttribute[] | null;
  timeRange: TimeRange | null;
  error?: Error;
}

export interface ScreenshotResults {
  timeRange: TimeRange | null;
  screenshots: Screenshot[];
  error?: Error;
  elementsPositionAndAttributes?: ElementsPositionAndAttribute[]; // NOTE: for testing
}
