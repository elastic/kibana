/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import events from 'events';
import Puid from 'puid';
import { constants } from './constants';
import { createIndex } from './helpers/create_index';
import { isPlainObject } from 'lodash';

const puid = new Puid();

export class Job extends events.EventEmitter {
  constructor(queue, index, jobtype, payload, options = {}) {
    if (typeof jobtype !== 'string') throw new Error('Jobtype must be a string');
    if (!isPlainObject(payload)) throw new Error('Payload must be a plain object');

    super();

    this.queue = queue;
    this._client = this.queue.client;
    this.id = puid.generate();
    this.index = index;
    this.jobtype = jobtype;
    this.payload = payload;
    this.created_by = options.created_by || false;
    this.timeout = options.timeout || 10000;
    this.maxAttempts = options.max_attempts || 3;
    this.priority = Math.max(Math.min(options.priority || 10, 20), -20);
    this.indexSettings = options.indexSettings || {};
    this.browser_type = options.browser_type;

    if (typeof this.maxAttempts !== 'number' || this.maxAttempts < 1) {
      throw new Error(`Invalid max_attempts: ${this.maxAttempts}`);
    }

    this.debug = (msg, err) => {
      const logger = options.logger || function () {};
      const message = `${this.id} - ${msg}`;
      const tags = ['debug'];

      if (err) {
        logger(`${message}: ${err}`, tags);
        return;
      }

      logger(message, tags);
    };

    const indexParams = {
      index: this.index,
      id: this.id,
      body: {
        jobtype: this.jobtype,
        meta: {
          // We are copying these values out of payload because these fields are indexed and can be aggregated on
          // for tracking stats, while payload contents are not.
          objectType: payload.objectType,
          layout: payload.layout ? payload.layout.id : 'none',
        },
        payload: this.payload,
        priority: this.priority,
        created_by: this.created_by,
        timeout: this.timeout,
        process_expiration: new Date(0), // use epoch so the job query works
        created_at: new Date(),
        attempts: 0,
        max_attempts: this.maxAttempts,
        status: constants.JOB_STATUS_PENDING,
        browser_type: this.browser_type,
      }
    };

    if (options.headers) {
      indexParams.headers = options.headers;
    }

    this.ready = createIndex(this._client, this.index, this.indexSettings)
      .then(() => this._client.callWithInternalUser('index', indexParams))
      .then((doc) => {
        this.document = {
          id: doc._id,
          index: doc._index,
          _seq_no: doc._seq_no,
          _primary_term: doc._primary_term,
        };
        this.debug(`Job created in index ${this.index}`);

        return this._client.callWithInternalUser('indices.refresh', {
          index: this.index
        }).then(() => {
          this.debug(`Job index refreshed ${this.index}`);
          this.emit(constants.EVENT_JOB_CREATED, this.document);
        });
      })
      .catch((err) => {
        this.debug('Job creation failed', err);
        this.emit(constants.EVENT_JOB_CREATE_ERROR, err);
      });
  }

  emit(name, ...args) {
    super.emit(name, ...args);
    this.queue.emit(name, ...args);
  }

  get() {
    return this.ready
      .then(() => {
        return this._client.callWithInternalUser('get', {
          index: this.index,
          id: this.id
        });
      })
      .then((doc) => {
        return Object.assign(doc._source, {
          index: doc._index,
          id: doc._id,
          _seq_no: doc._seq_no,
          _primary_term: doc._primary_term,
        });
      });
  }

  toJSON() {
    return {
      id: this.id,
      index: this.index,
      jobtype: this.jobtype,
      created_by: this.created_by,
      payload: this.payload,
      timeout: this.timeout,
      max_attempts: this.maxAttempts,
      priority: this.priority,
      browser_type: this.browser_type,
    };
  }
}
