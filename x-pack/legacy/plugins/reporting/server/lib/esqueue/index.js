/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventEmitter } from 'events';
import { Job } from './job';
import { Worker } from './worker';
import { constants } from './constants';
import { indexTimestamp } from './helpers/index_timestamp';
import { omit } from 'lodash';

export { events } from './constants/events';

export class Esqueue extends EventEmitter {
  constructor(index, options = {}) {
    if (!index) throw new Error('Must specify an index to write to');

    super();
    this.index = index;
    this.settings = {
      interval: constants.DEFAULT_SETTING_INTERVAL,
      timeout: constants.DEFAULT_SETTING_TIMEOUT,
      dateSeparator: constants.DEFAULT_SETTING_DATE_SEPARATOR,
      ...omit(options, ['client']),
    };
    this.client = options.client;
    this._logger = options.logger || function() {};
    this._workers = [];
    this._initTasks().catch(err => this.emit(constants.EVENT_QUEUE_ERROR, err));
  }

  _initTasks() {
    const initTasks = [this.client.callWithInternalUser('ping')];

    return Promise.all(initTasks).catch(err => {
      this._logger(['initTasks', 'error'], err);
      throw err;
    });
  }

  addJob(jobtype, payload, opts = {}) {
    const timestamp = indexTimestamp(this.settings.interval, this.settings.dateSeparator);
    const index = `${this.index}-${timestamp}`;
    const defaults = {
      timeout: this.settings.timeout,
    };

    const options = Object.assign(defaults, opts, {
      indexSettings: this.settings.indexSettings,
      logger: this._logger,
    });

    return new Job(this, index, jobtype, payload, options);
  }

  registerWorker(type, workerFn, opts) {
    const worker = new Worker(this, type, workerFn, { ...opts, logger: this._logger });
    this._workers.push(worker);
    return worker;
  }

  getWorkers() {
    return this._workers.map(fn => fn);
  }

  destroy() {
    const workers = this._workers.filter(worker => worker.destroy());
    this._workers = workers;
  }
}
