
import bluebird, {
  promisify,
  filter as filterAsync
} from 'bluebird';
import fs from 'fs';
import _ from 'lodash';
import mkdirp from 'mkdirp';
import path from 'path';
import testSubjSelector from '@spalger/test-subj-selector';
import {
  format,
  parse
} from 'url';

import getUrl from '../../utils/get_url';

import {
  config,
  defaultFindTimeout,
  defaultTryTimeout,
  esClient
} from '../index';

import PageObjects from './index';

import {
  Log,
  Try
} from '../utils';

const mkdirpAsync = promisify(mkdirp);
const writeFileAsync = promisify(fs.writeFile);

export default class Common {

  init(remote) {
    function injectTimestampQuery(func, url) {
      const formatted = modifyQueryString(url, function (parsed) {
        parsed.query._t = Date.now();
      });
      return func.call(this, formatted);
    }

    function removeTimestampQuery(func) {
      return func.call(this)
      .then(function (url) {
        return modifyQueryString(url, function (parsed) {
          parsed.query = _.omit(parsed.query, '_t');
        });
      });
    }

    function modifyQueryString(url, func) {
      const parsed = parse(url, true);
      if (parsed.query === null) {
        parsed.query = {};
      }
      func(parsed);
      return format(_.pick(parsed, 'protocol', 'hostname', 'port', 'pathname', 'query', 'hash', 'auth'));
    }

    this.remote = remote;
    if (remote.get.wrapper !== injectTimestampQuery) {
      this.remote.get = _.wrap(this.remote.get, injectTimestampQuery);
      remote.get.wrapper = injectTimestampQuery;
      this.remote.getCurrentUrl = _.wrap(this.remote.getCurrentUrl, removeTimestampQuery);
    }
  }

  getHostPort() {
    return getUrl.baseUrl(config.servers.kibana);
  }

  getEsHostPort() {
    return getUrl.baseUrl(config.servers.elasticsearch);
  }

  navigateToUrl(appName, subUrl) {
    const appConfig = Object.assign({}, config.apps[appName], {
      // Overwrite the default hash with the URL we really want.
      hash: `${appName}/${subUrl}`,
    });
    const appUrl = getUrl.noAuth(config.servers.kibana, appConfig);
    return this.remote.get(appUrl);
  }

  navigateToApp(appName) {
    const self = this;
    const appUrl = getUrl.noAuth(config.servers.kibana, config.apps[appName]);
    self.debug('navigating to ' + appName + ' url: ' + appUrl);

    function navigateTo(url) {
      return self.try(function () {
        // since we're using hash URLs, always reload first to force re-render
        return esClient.getDefaultIndex()
        .then(function (defaultIndex) {
          if (appName === 'discover' || appName === 'visualize' || appName === 'dashboard') {
            if (!defaultIndex) {
              // https://github.com/elastic/kibana/issues/7496
              // Even though most tests are using esClient to set the default index, sometimes Kibana clobbers
              // that change.  If we got here, fix it.
              self.debug(' >>>>>>>> WARNING Navigating to [' + appName + '] with defaultIndex=' + defaultIndex);
              self.debug(' >>>>>>>> Setting defaultIndex to "logstash-*""');
              return esClient.updateConfigDoc({ 'dateFormat:tz':'UTC', 'defaultIndex':'logstash-*' });
            }
          }
        })
        .then(function () {
          self.debug('navigate to: ' + url);
          return self.remote.get(url);
        })
        .then(function () {
          return self.sleep(700);
        })
        .then(function () {
          self.debug('returned from get, calling refresh');
          return self.remote.refresh();
        })
        .then(function () {
          return self.remote.getCurrentUrl();
        })
        .then(function (currentUrl) {
          const loginPage = new RegExp('login').test(currentUrl);
          if (loginPage) {
            self.debug('Found loginPage username = '
              + config.servers.kibana.username);
            return PageObjects.shield.login(config.servers.kibana.username,
              config.servers.kibana.password)
            .then(function () {
              return self.remote.getCurrentUrl();
            });
          } else {
            return currentUrl;
          }
        })
        .then(function (currentUrl) {
          currentUrl = currentUrl.replace(/\/\/\w+:\w+@/, '//');
          const maxAdditionalLengthOnNavUrl = 230;
          // On several test failures at the end of the TileMap test we try to navigate back to
          // Visualize so we can create the next Vertical Bar Chart, but we can see from the
          // logging and the screenshot that it's still on the TileMap page. Why didn't the "get"
          // with a new timestamped URL go? I thought that sleep(700) between the get and the
          // refresh would solve the problem but didn't seem to always work.
          // So this hack fails the navSuccessful check if the currentUrl doesn't match the
          // appUrl plus up to 230 other chars.
          // Navigating to Settings when there is a default index pattern has a URL length of 196
          // (from debug output). Some other tabs may also be long. But a rather simple configured
          // visualization is about 1000 chars long. So at least we catch that case.

          // Browsers don't show the ':port' if it's 80 or 443 so we have to
          // remove that part so we can get a match in the tests.
          const navSuccessful = new RegExp(appUrl.replace(':80','').replace(':443','')
           + '.{0,' + maxAdditionalLengthOnNavUrl + '}$')
          .test(currentUrl);

          if (!navSuccessful) {
            const msg = 'App failed to load: ' + appName +
            ' in ' + defaultFindTimeout + 'ms' +
            ' appUrl = ' + appUrl +
            ' currentUrl = ' + currentUrl;
            self.debug(msg);
            throw new Error(msg);
          }

          return currentUrl;
        });
      });
    }

    return self.tryForTime(defaultTryTimeout * 3, () => {
      return navigateTo(appUrl)
      .then(function (currentUrl) {
        let lastUrl = currentUrl;
        return self.try(function () {
          // give the app time to update the URL
          return self.sleep(501)
          .then(function () {
            return self.remote.getCurrentUrl();
          })
          .then(function (currentUrl) {
            self.debug('in navigateTo url = ' + currentUrl);
            if (lastUrl !== currentUrl) {
              lastUrl = currentUrl;
              throw new Error('URL changed, waiting for it to settle');
            }
          });
        });
      })
      .then(async () => {
        if (appName === 'status_page') return;
        if (await self.doesTestSubjectExist('statusPageContainer')) {
          throw new Error('Navigation ended up at the status page.');
        }
      });
    });
  }

  runScript(fn, timeout) {
    const self = this;
    // by default, give the app 10 seconds to load
    timeout = timeout || 10000;

    // wait for deps on window before running script
    return self.remote
    .setExecuteAsyncTimeout(timeout)
    .executeAsync(function (done) {
      const interval = setInterval(function () {
        const ready = (document.readyState === 'complete');
        const hasJQuery = !!window.$;

        if (ready && hasJQuery) {
          console.log('doc ready, jquery loaded');
          clearInterval(interval);
          done();
        }
      }, 10);
    }).then(function () {
      return self.remote.execute(fn);
    });
  }

  tryForTime(timeout, block) {
    return Try.tryForTime(timeout, block);
  }

  try(block) {
    return Try.try(block);
  }

  tryMethod(object, method, ...args) {
    return this.try(() => object[method](...args));
  }

  log(...args) {
    Log.log(...args);
  }

  debug(...args) {
    Log.debug(...args);
  }

  sleep(sleepMilliseconds) {
    const self = this;
    self.debug('... sleep(' + sleepMilliseconds + ') start');

    return bluebird.resolve().delay(sleepMilliseconds)
    .then(function () { self.debug('... sleep(' + sleepMilliseconds + ') end'); });
  }

  createErrorHandler(testObj) {
    const testName = (testObj.parent) ? [testObj.parent.name, testObj.name].join('_') : testObj.name;
    return error => {
      return this.remote.getCurrentUrl()
        .then(url => {
          PageObjects.common.debug(`Failure at URL ${url}`);
          const now = Date.now();
          const fileName = `failure_${now}_${testName}`;

          return this.saveScreenshot(fileName, true)
            .then(function () {
              throw error;
            });
        });
    };
  }

  async saveScreenshot(fileName, isFailure = false) {
    try {
      const directoryName = isFailure ? 'failure' : 'session';
      const directoryPath = path.resolve(`test/screenshots/${directoryName}`);
      const filePath = path.resolve(directoryPath, `${fileName}.png`);
      this.debug(`Taking screenshot "${filePath}"`);

      const screenshot = await this.remote.takeScreenshot();
      await mkdirpAsync(directoryPath);
      await writeFileAsync(filePath, screenshot);
    } catch (err) {
      this.log(`SCREENSHOT FAILED: ${err}`);
    }
  }

  async doesCssSelectorExist(selector) {
    PageObjects.common.debug(`doesCssSelectorExist ${selector}`);
    const exists = await this.remote
      .setFindTimeout(1000)
      .findByCssSelector(selector)
      .then(() => true)
      .catch(() => false);
    await this.remote.setFindTimeout(defaultFindTimeout);

    PageObjects.common.debug(`exists? ${exists}`);
    return exists;
  }

  findByCssSelector(selector) {
    PageObjects.common.debug(`findByCssSelector ${selector}`);
    return this.remote.setFindTimeout(defaultFindTimeout).findByCssSelector(selector);
  }

  async doesTestSubjectExist(selector) {
    PageObjects.common.debug(`doesTestSubjectExist ${selector}`);
    const exists = await this.remote
      .setFindTimeout(1000)
      .findDisplayedByCssSelector(testSubjSelector(selector))
      .then(() => true)
      .catch(() => false);
    this.remote.setFindTimeout(defaultFindTimeout);
    return exists;
  }

  async clickTestSubject(selector) {
    return await Try.try(async () => {
      await this.findTestSubject(selector).click();
    });
  }

  findTestSubject(selector, timeout = defaultFindTimeout) {
    this.debug('in findTestSubject: ' + testSubjSelector(selector));
    let originalFindTimeout = null;
    return this.remote
      .getFindTimeout()
      .then((findTimeout) => originalFindTimeout = findTimeout)
      .setFindTimeout(timeout)
      .findDisplayedByCssSelector(testSubjSelector(selector))
      .then(
        (result) => this.remote.setFindTimeout(originalFindTimeout)
          .finally(() => result),
        (error) => this.remote.setFindTimeout(originalFindTimeout)
          .finally(() => { throw error; }),
      );
  }

  async findAllTestSubjects(selector) {
    this.debug('in findAllTestSubjects: ' + testSubjSelector(selector));
    const all = await this.findAllByCssSelector(testSubjSelector(selector));
    return await filterAsync(all, el => el.isDisplayed());
  }

  async findAllByCssSelector(selector, timeout = defaultFindTimeout) {
    this.debug('in findAllByCssSelector: ' + selector);
    const remote = this.remote.setFindTimeout(timeout);
    let elements = await remote.findAllByCssSelector(selector);
    this.remote.setFindTimeout(defaultFindTimeout);
    if (!elements) elements = [];
    this.debug(`Found ${elements.length} for selector ${selector}`);
    return elements;
  }

  async getSharedItemTitleAndDescription() {
    const element = await this.remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('[data-shared-item]');

    return {
      title: await element.getAttribute('data-title'),
      description: await element.getAttribute('data-description')
    };
  }

  /**
   * Makes sure the modal overlay is not showing, tries a few times in case it is in the process of hiding.
   */
  async ensureModalOverlayHidden() {
    return PageObjects.common.try(async () => {
      const shown = await this.doesTestSubjectExist('modalOverlay');
      if (shown) {
        throw new Error('Modal overlay is showing');
      }
    });
  }

  async clickConfirmOnModal() {
    this.debug('Clicking modal confirm');
    await this.findTestSubject('confirmModalConfirmButton').click();
    await this.ensureModalOverlayHidden();
  }

  async clickCancelOnModal() {
    this.debug('Clicking modal cancel');
    await this.findTestSubject('confirmModalCancelButton').click();
    await this.ensureModalOverlayHidden();
  }

  async isConfirmModalOpen() {
    let isOpen = true;
    await this.findTestSubject('confirmModalCancelButton', 2000).catch(() => isOpen = false);
    await this.remote.setFindTimeout(defaultFindTimeout);
    return isOpen;
  }
}
