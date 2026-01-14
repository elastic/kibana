/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { Page, BoundingBox } from 'puppeteer';
import UPNG from '@pdf-lib/upng';

import { ZOOM } from '../../layouts/preserve_layout';

const ROWS_PER_TILE = 8000;

interface GetScreenshotParams {
  logger: Logger;
  page: Page;
  rect: BoundingBox;
}

export async function getTiledScreenshot(params: GetScreenshotParams): Promise<Buffer | undefined> {
  try {
    return getTiledScreenshotWrapped(params);
  } catch (err) {
    params.logger.error(`error generating screenshot: ${err.message}`, err);
    return;
  }
}

export async function getTiledScreenshotWrapped(
  params: GetScreenshotParams
): Promise<Buffer | undefined> {
  const { page, rect, logger } = params;

  const tiles = partitionScreen(rect);
  if (tiles.length === 0) {
    logger.warn('screenshot was 0-sized, skipping');
    return;
  }

  // 4 bytes for each pixel (RGBA), multiply by zoom (both dimensions)
  const bufferSize = 4 * ZOOM * ZOOM * rect.width * rect.height;
  const result = new Uint8Array(new ArrayBuffer(bufferSize));
  log(`width: ${rect.width}; height: ${rect.height}; bufferSize: ${bufferSize}`);

  let offset = 0;
  for (const tile of tiles) {
    const screenshot = await getSingleScreenshot({ logger, page, rect: tile });
    log(`- tile ${JSON.stringify(tile)}; offset: ${offset}`);
    const bytes = new Uint8Array(screenshot);
    const image = UPNG.decode(bytes.buffer);
    const rgbaBytes = UPNG.toRGBA8(image)[0];
    log(`  - image: width: ${image.width}; height: ${image.height}; depth: ${image.depth}`);
    const imageData = new Uint8Array(rgbaBytes);

    result.set(imageData, offset);

    offset += rgbaBytes.byteLength;
  }

  log(`new image; height: ${rect.height * ZOOM}; width: ${rect.width * ZOOM}`);
  const resultImage = UPNG.encode([result.buffer], rect.width * ZOOM, rect.height * ZOOM, 0);
  return Buffer.from(new Uint8Array(resultImage));

  function log(message: string) {
    logger.debug(`getTiledScreenshot: ${message}`);
  }
}

async function getSingleScreenshot(params: GetScreenshotParams): Promise<Uint8Array> {
  const { page } = params;

  return await page.screenshot({
    clip: params.rect,
    captureBeyondViewport: false, // workaround for an internal resize. See: https://github.com/puppeteer/puppeteer/issues/7043
  });
}

// Split a page into tiles but only length-wise, as it's easy to
// concatenate rows, much harder to concatenate columns.  And we've
// only seen issues with "big dashboards" be long ones, not wide ones.
export function partitionScreen(rect: BoundingBox): BoundingBox[] {
  const result: BoundingBox[] = [];

  const { x, y, width, height } = rect;

  let currY = 0;
  while (currY < height) {
    const tileHeight =
      currY + ROWS_PER_TILE <= height
        ? // use ROWS_PER_TILE if this tile has at least that many rows
          ROWS_PER_TILE
        : // otherwse use remaining rows
          height - currY;

    result.push({
      x,
      y: y + currY,
      width,
      height: tileHeight,
    });

    currY += ROWS_PER_TILE;
  }

  return result;
}
