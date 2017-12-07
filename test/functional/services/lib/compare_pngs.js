import fs from 'fs';
import pixelmatch from 'pixelmatch';
import Jimp from 'jimp';
import { PNG } from 'pngjs';

async function getImageBuffer(image) {
  return new Promise((resolve, reject) => {
    image.getBuffer(Jimp.MIME_PNG, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}

export async function comparePngs(actualPath, expectedPath, diffPath, log) {
  log.debug(`comparePngs: ${actualPath} vs ${expectedPath}`);
  const actual = await Jimp.read(actualPath);
  const expected = await Jimp.read(expectedPath);

  if (actual.bitmap.width !== expected.bitmap.width || actual.bitmap.height !== expected.bitmap.height) {
    const width = Math.min(actual.bitmap.width, expected.bitmap.width);
    const height = Math.min(actual.bitmap.height, expected.bitmap.height);
    actual.resize(width, height);
    expected.resize(width, height);

    actual.write(actualPath);
    expected.write(expectedPath);
  }

  const actualBuffer = await getImageBuffer(actual);
  const expectedBuffer = await getImageBuffer(expected);

  const diffPng = new PNG({ width: actual.bitmap.width, height: actual.bitmap.height });

  log.debug(`calculating diff pixels...`);
  // Note that this threshold value only affects color comparison from pixel to pixel. It won't have
  // any affect when comparing neighboring pixels - so slight shifts, font variations, or "blurry-ness"
  // will still show up as diffs, but upping this will not help that.  Instead we keep the threshold low, and expect
  // some the diffCount to be lower than our own threshold value.
  const THRESHOLD = .1;
  const diffPixels = pixelmatch(
    actualBuffer,
    expectedBuffer,
    diffPng.data,
    expected.bitmap.width,
    expected.bitmap.height,
    {
      threshold: THRESHOLD,
      // Adding this doesn't seem to make a difference at all, but ideally we want to avoid picking up anti aliasing
      // differences from fonts on different OSs.
      includeAA: true
    }
  );
  log.debug(`diff pixels: ${diffPixels}`);
  if (diffPixels > 0) {
    diffPng.pack().pipe(fs.createWriteStream(diffPath));
  }
  return diffPixels;
}
