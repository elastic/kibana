/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { parse, join } from 'path';
import Jimp from 'jimp';
import { ToolingLog } from '@kbn/dev-utils';

/**
 * Comparing pngs and writing result to provided directory
 *
 * @param sessionPath
 * @param baselinePath
 * @param diffPath
 * @param sessionDirectory
 * @param log
 * @returns Percent
 */
export async function comparePngs(
  sessionPath: string,
  baselinePath: string,
  diffPath: string,
  sessionDirectory: string,
  log: ToolingLog
) {
  log.debug(`comparePngs: ${sessionPath} vs ${baselinePath}`);
  const session = (await Jimp.read(sessionPath)).clone();
  const baseline = (await Jimp.read(baselinePath)).clone();

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
    session.write(join(sessionDirectory, `${parse(sessionPath).name}-session-resized.png`));
    baseline.write(join(sessionDirectory, `${parse(baselinePath).name}-baseline-resized.png`));
  }
  return percent;
}
