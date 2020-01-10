/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

export class Poller {
  constructor(options) {
    this.functionToPoll = options.functionToPoll; // Must return a Promise
    this.successFunction = options.successFunction || _.noop;
    this.errorFunction = options.errorFunction || _.noop;
    this.pollFrequencyInMillis = options.pollFrequencyInMillis;
    this.trailing = options.trailing || false;
    this.continuePollingOnError = options.continuePollingOnError || false;
    this.pollFrequencyErrorMultiplier = options.pollFrequencyErrorMultiplier || 1;
    this._timeoutId = null;
    this._isRunning = false;
  }

  getPollFrequency() {
    return this.pollFrequencyInMillis;
  }

  _poll() {
    return this.functionToPoll()
      .then(this.successFunction)
      .then(() => {
        if (!this._isRunning) {
          return;
        }

        this._timeoutId = setTimeout(this._poll.bind(this), this.pollFrequencyInMillis);
      })
      .catch(e => {
        this.errorFunction(e);
        if (!this._isRunning) {
          return;
        }

        if (this.continuePollingOnError) {
          this._timeoutId = setTimeout(
            this._poll.bind(this),
            this.pollFrequencyInMillis * this.pollFrequencyErrorMultiplier
          );
        } else {
          this.stop();
        }
      });
  }

  start() {
    if (this._isRunning) {
      return;
    }

    this._isRunning = true;
    if (this.trailing) {
      this._timeoutId = setTimeout(this._poll.bind(this), this.pollFrequencyInMillis);
    } else {
      this._poll();
    }
  }

  stop() {
    if (!this._isRunning) {
      return;
    }

    this._isRunning = false;
    clearTimeout(this._timeoutId);
    this._timeoutId = null;
  }

  isRunning() {
    return this._isRunning;
  }
}
