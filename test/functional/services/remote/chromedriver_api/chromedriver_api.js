import { EventEmitter } from 'events';

import { createLocalChromedriverApi } from './chromedriver_local_api';
import { createRemoteChromedriverApi } from './chromedriver_remote_api';
import { ping } from './ping';

const noop = () => {};

/**
 *  Api for interacting with a local or remote instance of Chromedriver
 *
 *  @type {Object}
 */
export class ChromedriverApi extends EventEmitter {
  static async factory(log, url) {
    return (await ping(url))
      ? createRemoteChromedriverApi(log, url)
      : createLocalChromedriverApi(log, url);
  }

  constructor(options = {}) {
    super();

    const {
      url,
      start = noop,
      stop = noop,
    } = options;

    if (!url) {
      throw new TypeError('url is a required parameter');
    }

    this._url = url;
    this._state = undefined;
    this._callCustomStart = () => start(this);
    this._callCustomStop = () => stop(this);
    this._beforeStopFns = [];
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
      throw new Error('Chromedriver can only be started once');
    }

    this._state = 'started';
    await this._callCustomStart();
  }

  async stop() {
    if (this._state !== 'started') {
      throw new Error('Chromedriver can only be stopped after being started');
    }

    this._state = 'stopped';

    for (const fn of this._beforeStopFns.splice(0)) {
      await fn();
    }

    await this._callCustomStop();
  }
}
