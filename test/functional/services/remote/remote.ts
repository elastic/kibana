/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import { resolve } from 'path';

import { mergeMap } from 'rxjs/operators';

import { FtrProviderContext } from '../../ftr_provider_context';
import { initWebDriver, BrowserConfig } from './webdriver';
import { Browsers } from './browsers';

export async function RemoteProvider({ getService }: FtrProviderContext) {
  const lifecycle = getService('lifecycle');
  const log = getService('log');
  const config = getService('config');
  const browserType: Browsers = config.get('browser.type');
  const collectCoverage: boolean = !!process.env.CODE_COVERAGE;
  const coveragePrefix = 'coveragejson:';
  const coverageDir = resolve(__dirname, '../../../../target/kibana-coverage/functional');
  let coverageCounter = 1;
  type BrowserStorage = 'sessionStorage' | 'localStorage';

  const clearBrowserStorage = async (storageType: BrowserStorage) => {
    try {
      await driver.executeScript(`window.${storageType}.clear();`);
    } catch (error) {
      if (!error.message.includes(`Failed to read the '${storageType}' property from 'Window'`)) {
        throw error;
      }
    }
  };

  const writeCoverage = (coverageJson: string) => {
    // on CI we make hard link clone and run tests from kibana${process.env.CI_GROUP} root path
    const re = new RegExp(`kibana${process.env.CI_GROUP}`, 'g');
    const dir = process.env.CI ? coverageDir.replace(re, 'kibana') : coverageDir;

    if (!Fs.existsSync(dir)) {
      Fs.mkdirSync(dir, { recursive: true });
    }

    const id = coverageCounter++;
    const timestamp = Date.now();
    const path = resolve(dir, `${id}.${timestamp}.coverage.json`);
    log.info('writing coverage to', path);

    const jsonString = process.env.CI ? coverageJson.replace(re, 'kibana') : coverageJson;
    Fs.writeFileSync(path, JSON.stringify(JSON.parse(jsonString), null, 2));
  };

  const browserConfig: BrowserConfig = {
    logPollingMs: config.get('browser.logPollingMs'),
    acceptInsecureCerts: config.get('browser.acceptInsecureCerts'),
  };

  const { driver, consoleLog$ } = await initWebDriver(log, browserType, lifecycle, browserConfig);
  const caps = await driver.getCapabilities();

  log.info(
    `Remote initialized: ${caps.get('browserName')} ${caps.get(
      'browserVersion'
    )}, collectingCoverage=${collectCoverage}`
  );

  if ([Browsers.Chrome, Browsers.ChromiumEdge].includes(browserType)) {
    log.info(
      `${browserType}driver version: ${caps.get(browserType)[`${browserType}driverVersion`]}`
    );
  }

  consoleLog$
    .pipe(
      mergeMap((logEntry) => {
        if (collectCoverage && logEntry.message.includes(coveragePrefix)) {
          const [, coverageJsonBase64] = logEntry.message.split(coveragePrefix);
          const coverageJson = Buffer.from(coverageJsonBase64, 'base64').toString('utf8');
          writeCoverage(coverageJson);

          // filter out this message
          return [];
        }

        return [logEntry];
      })
    )
    .subscribe({
      next({ message, level }) {
        const msg = message.replace(/\\n/g, '\n');
        log[level === 'SEVERE' || level === 'error' ? 'warning' : 'debug'](
          `browser[${level}] ${msg}`
        );
      },
    });

  lifecycle.beforeTests.add(async () => {
    // hard coded default, can be overridden per suite using `browser.setWindowSize()`
    // and will be automatically reverted after each suite
    await driver.manage().window().setRect({ width: 1600, height: 1000 });
  });

  const windowSizeStack: Array<{ width: number; height: number }> = [];
  lifecycle.beforeTestSuite.add(async () => {
    windowSizeStack.unshift(await driver.manage().window().getRect());
  });

  lifecycle.beforeEachTest.add(async () => {
    await driver.manage().setTimeouts({ implicit: config.get('timeouts.find') });
  });

  lifecycle.afterTestSuite.add(async () => {
    const { width, height } = windowSizeStack.shift()!;
    await driver.manage().window().setRect({ width, height });
    await clearBrowserStorage('sessionStorage');
    await clearBrowserStorage('localStorage');
  });

  lifecycle.cleanup.add(async () => {
    // Getting the last piece of code coverage before closing browser
    if (collectCoverage) {
      const coverageJson = await driver
        .executeScript('return window.__coverage__')
        .catch(() => undefined)
        .then((coverage) => (coverage ? JSON.stringify(coverage) : undefined));
      if (coverageJson) {
        writeCoverage(coverageJson);
      }
    }

    await driver.quit();
  });

  return { driver, browserType, consoleLog$ };
}
