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

export const ROWS_PER_TILE = 8000;

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

  if (tiles.length === 1) {
    const screenshot = await getSingleScreenshot({ logger, page, rect });
    return Buffer.from(screenshot);
  }

  const messagePrefix = 'getTiledScreenshot: ';
  const messageMeta = { tags: ['tiled-report'] };
  const debug = (message: string) => logger.debug(`${messagePrefix}${message}`, messageMeta);

  // 4 bytes for each pixel (RGBA), multiply by zoom (both dimensions)
  const bufferSize = 4 * ZOOM * ZOOM * rect.width * rect.height;
  const result = new Uint8Array(new ArrayBuffer(bufferSize));
  debug(
    `allocated buffer: width: ${rect.width}; height: ${rect.height}; bufferSize: ${bufferSize}`
  );

  let offset = 0;
  for (const tile of tiles) {
    debug(`getting tile: ${JSON.stringify(tile)}`);
    const screenshot = await getSingleScreenshot({ logger, page, rect: tile });
    const image = UPNG.decode(screenshot);
    const rgbaBytes = UPNG.toRGBA8(image)[0];
    debug(`got tile: width: ${image.width}; height: ${image.height}; depth: ${image.depth}`);
    const imageData = new Uint8Array(rgbaBytes);

    debug(`copying tile to buffer offset: ${offset}`);
    result.set(imageData, offset);

    offset += rgbaBytes.byteLength;
  }

  const finalWidth = rect.width * ZOOM;
  const finalHeight = rect.height * ZOOM;
  debug(`result image: width: ${finalWidth}; height: ${finalHeight}`);

  const resultImage = UPNG.encode([result.buffer], finalWidth, finalHeight, 0);
  return Buffer.from(resultImage);
}

async function getSingleScreenshot(params: GetScreenshotParams): Promise<ArrayBuffer> {
  const { page } = params;

  const image = await page.screenshot({
    clip: params.rect,
    captureBeyondViewport: false, // workaround for an internal resize. See: https://github.com/puppeteer/puppeteer/issues/7043
  });
  return image.buffer as ArrayBuffer;
}

// Split a page into tiles but only length-wise, as it's easy to
// concatenate rows, much harder to concatenate columns.  And we've
// only seen issues with "big dashboards" be long ones, not wide ones.
export function partitionScreen(rect: BoundingBox): BoundingBox[] {
  const result: BoundingBox[] = [];

  const { x, y, width, height } = rect;
  if (height <= 0) return [];

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
