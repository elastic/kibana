import { EventEmitter } from 'events';

import { createLocalBrowserDriverApi } from './browser_driver_local_api';
import { createRemoteBrowserDriverApi } from './browser_driver_remote_api';
import { ping } from './ping';

const noop = () => {};

/**
 *  Api for interacting with a local or remote instance of a browser
 *
 *  @type {Object}
 */
export class BrowserDriverApi extends EventEmitter {
  static async factory(log, url, browserType) {
    return (await ping(url))
      ? createRemoteBrowserDriverApi(log, url)
      : createLocalBrowserDriverApi(log, url, browserType);
  }

  constructor(options = {}) {
    super();

    const {
      url,
      start = noop,
      stop = noop,
      requiredCapabilities,
    } = options;

    if (!url) {
      throw new TypeError('url is a required parameter');
    }
    this._requiredCapabilities = requiredCapabilities;
    this._url = url;
    this._state = undefined;
    this._callCustomStart = () => start(this);
    this._callCustomStop = () => stop(this);
    this._beforeStopFns = [];
  }
  getRequiredCapabilities() {
    return this._requiredCapabilities;
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
