/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parse, join } from 'path';
import Jimp from 'jimp';
import { ToolingLog } from '@kbn/tooling-log';
import { promises as fs } from 'fs';
import path from 'path';

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

export async function checkIfPngsMatch(
  actualpngPath: string,
  baselinepngPath: string,
  screenshotsDirectory: string,
  log: any
) {
  log.debug(`checkIfpngsMatch: ${actualpngPath} vs ${baselinepngPath}`);
  // Copy the pngs into the screenshot session directory, as that's where the generated pngs will automatically be
  // stored.
  const sessionDirectoryPath = path.resolve(screenshotsDirectory, 'session');
  const failureDirectoryPath = path.resolve(screenshotsDirectory, 'failure');

  await fs.mkdir(sessionDirectoryPath, { recursive: true });
  await fs.mkdir(failureDirectoryPath, { recursive: true });

  const actualpngFileName = path.basename(actualpngPath, '.png');
  const baselinepngFileName = path.basename(baselinepngPath, '.png');

  const baselineCopyPath = path.resolve(
    sessionDirectoryPath,
    `${baselinepngFileName}_baseline.png`
  );
  const actualCopyPath = path.resolve(sessionDirectoryPath, `${actualpngFileName}_actual.png`);

  // Don't cause a test failure if the baseline snapshot doesn't exist - we don't have all OS's covered and we
  // don't want to start causing failures for other devs working on OS's which are lacking snapshots.  We have
  // mac and linux covered which is better than nothing for now.
  try {
    log.debug(`writeFile: ${baselineCopyPath}`);
    await fs.writeFile(baselineCopyPath, await fs.readFile(baselinepngPath));
  } catch (error) {
    throw new Error(`No baseline png found at ${baselinepngPath}`);
  }
  log.debug(`writeFile: ${actualCopyPath}`);
  await fs.writeFile(actualCopyPath, await fs.readFile(actualpngPath));

  let diffTotal = 0;

  const diffPngPath = path.resolve(failureDirectoryPath, `${baselinepngFileName}-${1}.png`);
  diffTotal += await comparePngs(
    actualCopyPath,
    baselineCopyPath,
    diffPngPath,
    sessionDirectoryPath,
    log
  );

  return diffTotal;
}
