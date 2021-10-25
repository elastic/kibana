/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parse, join } from 'path';
import Jimp from 'jimp';
import { ToolingLog } from '@kbn/dev-utils';

interface PngDescriptor {
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
 * Override Jimp types that expect to be mapped to either string or buffer even though Jimp
 * accepts both https://www.npmjs.com/package/jimp#basic-usage.
 */
const toJimp = (imageInfo: string | Buffer): Promise<Jimp> => {
  return (Jimp.read as (value: string | Buffer) => Promise<Jimp>)(imageInfo);
};

/**
 * Comparing pngs and writing result to provided directory
 *
 * @param session
 * @param baseline
 * @param diffPath
 * @param sessionDirectory
 * @param log
 * @returns Percent
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

  log.debug(`comparePngs: ${sessionDescriptor.path} vs ${baselineDescriptor.path}`);

  const session = (await toJimp(sessionDescriptor.buffer ?? sessionDescriptor.path)).clone();
  const baseline = (await toJimp(baselineDescriptor.buffer ?? baselineDescriptor.path)).clone();

  if (
    session.bitmap.width !== baseline.bitmap.width ||
    session.bitmap.height !== baseline.bitmap.height
  ) {
    // eslint-disable-next-line no-console
    console.log(
      'expected height ' + baseline.bitmap.height + ' and width ' + baseline.bitmap.width
    );
    // eslint-disable-next-line no-console
    console.log('actual height ' + session.bitmap.height + ' and width ' + session.bitmap.width);

    const width = Math.min(session.bitmap.width, baseline.bitmap.width);
    const height = Math.min(session.bitmap.height, baseline.bitmap.height);
    session.resize(width, height); // , Jimp.HORIZONTAL_ALIGN_LEFT | Jimp.VERTICAL_ALIGN_TOP);
    baseline.resize(width, height); // , Jimp.HORIZONTAL_ALIGN_LEFT | Jimp.VERTICAL_ALIGN_TOP);
  }

  session.quality(60);
  baseline.quality(60);

  log.debug(`calculating diff pixels...`);
  // Note that this threshold value only affects color comparison from pixel to pixel. It won't have
  // any affect when comparing neighboring pixels - so slight shifts, font variations, or "blurry-ness"
  // will still show up as diffs, but upping this will not help that.  Instead we keep the threshold low, and expect
  // some the diffCount to be lower than our own threshold value.
  const THRESHOLD = 0.1;
  const { image, percent } = Jimp.diff(session, baseline, THRESHOLD);
  log.debug(`percent different: ${percent}`);
  if (percent > 0) {
    image.write(diffPath);

    // For debugging purposes it'll help to see the resized images and how they compare.
    session.write(
      join(sessionDirectory, `${parse(sessionDescriptor.path).name}-session-resized.png`)
    );
    baseline.write(
      join(sessionDirectory, `${parse(baselineDescriptor.path).name}-baseline-resized.png`)
    );
  }
  return percent;
}
