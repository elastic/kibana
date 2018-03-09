import { EventEmitter } from 'events';

import { createLocalBrowserdriverApi } from './browserdriver_local_api';
import { createRemoteBrowserdriverApi } from './browserdriver_remote_api';
import { ping } from './ping';

const noop = () => {};

/**
 *  Api for interacting with a local or remote instance of a browser
 *
 *  @type {Object}
 */
export class BrowserdriverApi extends EventEmitter {
  static async factory(log, url, browser) {
    return (await ping(url))
      ? createRemoteBrowserdriverApi(log, url)
      : createLocalBrowserdriverApi(log, url, browser);
  }

  constructor(options = {}) {
    super();

    const {
      url,
      start = noop,
      stop = noop,
      browser,
    } = options;

    if (!url) {
      throw new TypeError('url is a required parameter');
    }
    this._browser = browser;
    this._url = url;
    this._state = undefined;
    this._callCustomStart = () => start(this);
    this._callCustomStop = () => stop(this);
    this._beforeStopFns = [];
  }
  getBrowserName() {
    return this._browser;
  }
  getUrl() {
    return this._url;
  }

  beforeStop(fn) {
    this._beforeStopFns.push(fn);
  }

  isStopped() {
    return this._state === 'stopped';
  }

  async start() {
    if (this._state !== undefined) {
      throw new Error('Driver can only be started once');
    }

    this._state = 'started';
    await this._callCustomStart();
  }

  async stop() {
    if (this._state !== 'started') {
      throw new Error('Driver can only be stopped after being started');
    }

    this._state = 'stopped';

    for (const fn of this._beforeStopFns.splice(0)) {
      await fn();
    }

    await this._callCustomStop();
  }
}
