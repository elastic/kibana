import Jimp from 'jimp';

export async function comparePngs(actualPath, expectedPath, diffPath, log) {
  log.debug(`comparePngs: ${actualPath} vs ${expectedPath}`);
  const actual = await Jimp.read(actualPath);
  const expected = await Jimp.read(expectedPath);

  if (actual.bitmap.width !== expected.bitmap.width || actual.bitmap.height !== expected.bitmap.height) {
    console.log('expected height ' + expected.bitmap.height + ' and width ' + expected.bitmap.width);
    console.log('actual height ' + actual.bitmap.height + ' and width ' + actual.bitmap.width);

    const width = Math.min(actual.bitmap.width, expected.bitmap.width);
    const height = Math.min(actual.bitmap.height, expected.bitmap.height);
    actual.resize(width, height);
    expected.resize(width, height);
    console.log('picking height ' + height + ' and width ' + width);
  }

  log.debug(`calculating diff pixels...`);
  // Note that this threshold value only affects color comparison from pixel to pixel. It won't have
  // any affect when comparing neighboring pixels - so slight shifts, font variations, or "blurry-ness"
  // will still show up as diffs, but upping this will not help that.  Instead we keep the threshold low, and expect
  // some the diffCount to be lower than our own threshold value.
  const THRESHOLD = .1;
  const { image, percent } = Jimp.diff(actual, expected, THRESHOLD);
  log.debug(`percentSimilar: ${percent}`);
  if (percent > 0) {
    image.write(diffPath);

    // For debugging purposes it'll help to see the resized images and how they compare.
    actual.write(actualPath);
    expected.write(expectedPath);
  }
  return percent;
}
