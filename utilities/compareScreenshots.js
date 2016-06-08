
const fs = require('fs');
const path = require('path');
const imageDiff = require('image-diff');
const mkdirp = require('mkdirp');

function compareScreenshots() {
  const SCREENSHOTS_DIR = 'test/screenshots';
  const BASELINE_SCREENSHOTS_DIR = path.resolve(SCREENSHOTS_DIR, 'baseline');
  const DIFF_SCREENSHOTS_DIR = path.resolve(SCREENSHOTS_DIR, 'diff');
  const SESSION_SCREENSHOTS_DIR = path.resolve(SCREENSHOTS_DIR, 'session');

  // We don't need to create the baseline dir because it's committed.
  mkdirp.sync(DIFF_SCREENSHOTS_DIR);
  mkdirp.sync(SESSION_SCREENSHOTS_DIR);

  fs.readdir(SESSION_SCREENSHOTS_DIR, (readDirError, files) => {
    const screenshots = files.filter(file => file.indexOf('.png') !== -1);

    screenshots.forEach(screenshot => {
      const sessionImagePath = path.resolve(SESSION_SCREENSHOTS_DIR, screenshot);
      const baselineImagePath = path.resolve(BASELINE_SCREENSHOTS_DIR, screenshot);
      const diffImagePath = path.resolve(DIFF_SCREENSHOTS_DIR, screenshot);

      imageDiff.getFullResult({
        actualImage: sessionImagePath,
        expectedImage: baselineImagePath,
        diffImage: diffImagePath,
        shadow: true,
      }, (comparisonError, result) => {
        if (comparisonError) {
          throw comparisonError;
        }

        const change = result.percentage;
        const changePercentage = (change * 100).toFixed(2);
        console.log(`${screenshot} has changed by ${changePercentage}%`);
      });
    });
  });
}

compareScreenshots();
