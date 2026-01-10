/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { Page } from 'puppeteer';
import UPNG from '@pdf-lib/upng';

import { ZOOM } from '../../layouts/preserve_layout';

const ROWS_PER_PANE = 400; // change to something like 4000, but 400 is easy to test with

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface GetScreenshotParams {
  logger: Logger;
  page: Page;
  rect: Rectangle;
}

export async function getStitchedScreenshot(
  params: GetScreenshotParams
): Promise<Buffer | undefined> {
  try {
    return getStitchedScreenshotWrapped(params);
  } catch (err) {
    params.logger.error(`error generating screenshot: ${err.message}`, err);
    return;
  }
}

export async function getStitchedScreenshotWrapped(
  params: GetScreenshotParams
): Promise<Buffer | undefined> {
  const { page, rect, logger } = params;

  const panes = partitionScreen(rect);
  if (panes.length === 0) {
    logger.warn('screenshot was 0-sized, skipping');
    return;
  }

  // 4 bytes for each pixel (RGBA), multiply by zoom (both dimensions)
  const bufferSize = 4 * ZOOM * ZOOM * rect.width * rect.height;
  const result = new Uint8Array(new ArrayBuffer(bufferSize));

  let offset = 0;
  for (const pane of panes) {
    const screenshot = await getSingleScreenshot({ logger, page, rect: pane });
    const bytes = new Uint8Array(screenshot);
    const image = UPNG.decode(bytes.buffer);
    const imageData = new Uint8Array(image.data);

    result.set(imageData, offset);

    offset += imageData.length;
  }

  const resultImage = UPNG.encode([result.buffer], rect.width * ZOOM, rect.height * ZOOM, 0);
  return Buffer.from(new Uint8Array(resultImage));
}

async function getSingleScreenshot(params: GetScreenshotParams): Promise<Uint8Array> {
  const { page } = params;
  const { x, y, width, height } = params.rect;

  return await page.screenshot({
    clip: { x, y, height, width },
    captureBeyondViewport: false, // workaround for an internal resize. See: https://github.com/puppeteer/puppeteer/issues/7043
  });
}

// Split a page into panes but only length-wise, as it's easy to
// concatenate rows, much harder to concatenate columns.  And we've
// only seen issues with "big dashboards" be long ones, not wide ones.
export function partitionScreen(rect: Rectangle): Rectangle[] {
  const result: Rectangle[] = [];

  const { x, y, width, height } = rect;

  let currY = 0;
  while (currY < height) {
    const paneHeight =
      currY + ROWS_PER_PANE <= height
        ? // use ROWS_PER_PANE if this pane has at least that many rows
          ROWS_PER_PANE
        : // otherwse use remaining rows
          height - currY;

    result.push({
      x,
      y: y + currY,
      width,
      height: paneHeight,
    });

    currY += ROWS_PER_PANE;
  }

  return result;
}
