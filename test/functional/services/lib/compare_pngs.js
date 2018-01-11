import path from 'path';
import Jimp from 'jimp';

export async function comparePngs(sessionPath, baselinePath, diffPath, sessionDirectory, log) {
  log.debug(`comparePngs: ${sessionPath} vs ${baselinePath}`);
  const session = (await Jimp.read(sessionPath)).clone();
  const baseline = (await Jimp.read(baselinePath)).clone();

  if (session.bitmap.width !== baseline.bitmap.width || session.bitmap.height !== baseline.bitmap.height) {
    console.log('expected height ' + baseline.bitmap.height + ' and width ' + baseline.bitmap.width);
    console.log('actual height ' + session.bitmap.height + ' and width ' + session.bitmap.width);

    const width = Math.min(session.bitmap.width, baseline.bitmap.width);
    const height = Math.min(session.bitmap.height, baseline.bitmap.height);
    session.resize(width, height);//, Jimp.HORIZONTAL_ALIGN_LEFT | Jimp.VERTICAL_ALIGN_TOP);
    baseline.resize(width, height);//, Jimp.HORIZONTAL_ALIGN_LEFT | Jimp.VERTICAL_ALIGN_TOP);
  }

  session.quality(60);
  baseline.quality(60);

  log.debug(`calculating diff pixels...`);
  // Note that this threshold value only affects color comparison from pixel to pixel. It won't have
  // any affect when comparing neighboring pixels - so slight shifts, font variations, or "blurry-ness"
  // will still show up as diffs, but upping this will not help that.  Instead we keep the threshold low, and expect
  // some the diffCount to be lower than our own threshold value.
  const THRESHOLD = .1;
  const { image, percent } = Jimp.diff(session, baseline, THRESHOLD);
  log.debug(`percentSimilar: ${percent}`);
  if (percent > 0) {
    image.write(diffPath);

    // For debugging purposes it'll help to see the resized images and how they compare.
    session.write(path.join(sessionDirectory, `${path.parse(sessionPath).name}-session-resized.png`));
    baseline.write(path.join(sessionDirectory, `${path.parse(baselinePath).name}-baseline-resized.png`));
  }
  return percent;
}
