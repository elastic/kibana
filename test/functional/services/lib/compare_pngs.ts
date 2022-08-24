/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join, parse } from 'path';
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';
import { ToolingLog } from '@kbn/tooling-log';
import { promises as fs } from 'fs';
import { PNG } from 'pngjs';
export interface PngDescriptor {
  path: string;

  /**
   * If a buffer is provided this will avoid the extra step of reading from disk
   */
  buffer?: Buffer;
}

const toDescriptor = (imageInfo: string | PngDescriptor): PngDescriptor => {
  if (typeof imageInfo === 'string') {
    return { path: imageInfo };
  }
  return {
    ...imageInfo,
  };
};

/**
 * Use sharp to open the image and get the metadata
 */
const getSharpInstance = async (
  imageInfo: string | Buffer
): Promise<{ instance: sharp.Sharp; metadata: sharp.Metadata }> => {
  const instance = sharp(imageInfo).png({ quality: 100, progressive: true }).clone();
  const metadata = await instance.metadata();
  return { instance, metadata };
};

/**
 * Comparing pngs and writing result to provided directory
 *
 * @param session
 * @param baseline
 * @param diffPath
 * @param sessionDirectory
 * @param log
 * @returns diffRatio
 */
export async function comparePngs(
  sessionInfo: string | PngDescriptor,
  baselineInfo: string | PngDescriptor,
  diffPath: string,
  sessionDirectory: string,
  log: ToolingLog
) {
  const sessionDescriptor = toDescriptor(sessionInfo);
  const baselineDescriptor = toDescriptor(baselineInfo);

  let sessionTestPath: string = sessionDescriptor.path;
  let baselineTestPath: string = baselineDescriptor.path;

  log.debug(`comparePngs: ${sessionTestPath} vs ${baselineTestPath}`);

  const { instance: session, metadata: sessionMetadata } = await getSharpInstance(
    sessionDescriptor.buffer ?? sessionTestPath
  );
  const sessionWidth = sessionMetadata.width ?? 0;
  const sessionHeight = sessionMetadata.height ?? 0;

  const { instance: baseline, metadata: baselineMetadata } = await getSharpInstance(
    baselineDescriptor.buffer ?? baselineTestPath
  );
  const baselineWidth = baselineMetadata.width ?? 0;
  const baselineHeight = baselineMetadata.height ?? 0;

  // Adjust screenshot size
  const testWidth = Math.min(sessionWidth, baselineWidth);
  const testHeight = Math.min(sessionHeight, baselineHeight);
  log.debug('baseline height ' + baselineHeight + ' and width ' + baselineWidth);
  log.debug('session height ' + sessionHeight + ' and width ' + sessionWidth);
  log.debug('test height ' + testHeight + ' and width ' + testWidth);
  if (sessionWidth !== baselineWidth || sessionHeight !== baselineHeight) {
    sessionTestPath = join(
      sessionDirectory,
      `${parse(sessionDescriptor.path).name}-session-resized.png`
    );
    baselineTestPath = join(
      sessionDirectory,
      `${parse(baselineDescriptor.path).name}-baseline-resized.png`
    );
    await session.resize(testWidth, testHeight, { fit: 'fill' }).png().toFile(sessionTestPath);
    await baseline.resize(testWidth, testHeight, { fit: 'fill' }).png().toFile(baselineTestPath);
  }

  log.debug(`calculating diff pixels...`);
  // Note that this threshold value only affects color comparison from pixel to pixel. It won't have
  // any affect when comparing neighboring pixels - so slight shifts, font variations, or "blurry-ness"
  // will still show up as diffs, but upping this will not help that.  Instead we keep the threshold low, and expect
  // some the diffCount to be lower than our own threshold value.
  const THRESHOLD = 0.1;
  const sessionTestImg = PNG.sync.read(await fs.readFile(sessionTestPath));
  const baselineTestImg = PNG.sync.read(await fs.readFile(baselineTestPath));
  const diff = new PNG({ width: testWidth, height: testHeight });
  const mismatchedPixels = pixelmatch(
    sessionTestImg.data,
    baselineTestImg.data,
    diff.data,
    testWidth,
    testHeight,
    {
      threshold: THRESHOLD,
    }
  );

  const diffRatio = mismatchedPixels / (testWidth * testHeight);

  log.debug(`percent different (ratio): ${diffRatio}`);
  if (diffRatio > 0) {
    const buffer = PNG.sync.write(diff);
    await fs.writeFile(diffPath, buffer);
  }
  return diffRatio;
}
