/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import events from 'events';
import Puid from 'puid';
import moment from 'moment';
import { constants } from './constants';
import { WorkerTimeoutError, UnspecifiedWorkerError } from './helpers/errors';
import { CancellationToken } from './helpers/cancellation_token';
import { Poller } from './helpers/poller';

const puid = new Puid();

function formatJobObject(job) {
  return {
    index: job._index,
    type: job._type,
    id: job._id,
    // Expose the payload of the job even when the job failed/timeout
    ...job._source.payload,
  };
}

export class Worker extends events.EventEmitter {
  constructor(queue, type, workerFn, opts) {
    if (typeof type !== 'string') throw new Error('type must be a string');
    if (typeof workerFn !== 'function') throw new Error('workerFn must be a function');
    if (typeof opts !== 'object') throw new Error('opts must be an object');
    if (typeof opts.interval !== 'number') throw new Error('opts.interval must be a number');
    if (typeof opts.intervalErrorMultiplier !== 'number') throw new Error('opts.intervalErrorMultiplier must be a number');

    super();

    this.id = puid.generate();
    this.queue = queue;
    this.client = opts.client || this.queue.client;
    this.jobtype = type;
    this.workerFn = workerFn;
    this.checkSize = opts.size || 10;
    this.capacity = opts.capacity || 2;
    this.processingJobCount = 0;

    this.debug = (msg, err) => {
      const logger = opts.logger || function () {};

      const message = `${this.id} - ${msg}`;
      const tags = ['worker', 'debug'];

      if (err) {
        logger(`${message}: ${err.stack  ? err.stack : err }`, tags);
        return;
      }

      logger(message, tags);
    };

    this._running = true;
    this.debug(`Created worker for job type ${this.jobtype}`);

    this._poller = new Poller({
      functionToPoll: () => {
        this._processPendingJobs();
        // Return an empty promise so that the processing jobs won't block the next poll.
        return Promise.resolve();
      },
      pollFrequencyInMillis: opts.interval,
      trailing: true,
      continuePollingOnError: true,
      pollFrequencyErrorMultiplier: opts.intervalErrorMultiplier,
    });
    // Reset all the existing processing jobs of this particular type.
    this._resetProcessingJobs();
    this._startJobPolling();
  }

  destroy() {
    this._running = false;
    this._stopJobPolling();
  }

  toJSON() {
    return {
      id: this.id,
      index: this.queue.index,
      jobType: this.jobType,
    };
  }

  emit(name, ...args) {
    super.emit(name, ...args);
    this.queue.emit(name, ...args);
  }

  _formatErrorParams(err, job) {
    const response = {
      error: err,
      worker: this.toJSON(),
    };

    if (job) response.job = formatJobObject(job);
    return response;
  }

  _claimJob(job) {
    const m = moment();
    const startTime = m.toISOString();
    const expirationTime = m.add(job._source.timeout).toISOString();
    const attempts = job._source.attempts + 1;

    if (attempts > job._source.max_attempts) {
      const msg = (!job._source.output) ? `Max attempts reached (${job._source.max_attempts})` : false;
      return this._failJob(job, msg)
        .then(() => false);
    }

    const doc = {
      attempts: attempts,
      started_at: startTime,
      process_expiration: expirationTime,
      status: constants.JOB_STATUS_PROCESSING,
    };

    return this.client.update({
      index: job._index,
      type: job._type,
      id: job._id,
      version: job._version,
      body: { doc }
    })
      .then((response) => {
        const updatedJob = {
          ...job,
          ...response
        };
        updatedJob._source = {
          ...job._source,
          ...doc
        };
        return updatedJob;
      })
      .catch((err) => {
        if (err.statusCode === 409) return true;
        this.debug(`_claimJob failed on job ${job._id}`, err);
        this.emit(constants.EVENT_WORKER_JOB_CLAIM_ERROR, this._formatErrorParams(err, job));
        return false;
      });
  }

  _failJob(job, output = false) {
    this.debug(`Failing job ${job._id}`);

    const completedTime = moment().toISOString();
    const docOutput = this._formatOutput(output);
    const doc = {
      status: constants.JOB_STATUS_FAILED,
      completed_at: completedTime,
      output: docOutput
    };

    this.emit(constants.EVENT_WORKER_JOB_FAIL, {
      job: formatJobObject(job),
      worker: this.toJSON(),
      output: docOutput,
    });

    return this.client.update({
      index: job._index,
      type: job._type,
      id: job._id,
      version: job._version,
      body: { doc }
    })
      .then(() => true)
      .catch((err) => {
        if (err.statusCode === 409) return true;
        this.debug(`_failJob failed to update job ${job._id}`, err);
        this.emit(constants.EVENT_WORKER_FAIL_UPDATE_ERROR, this._formatErrorParams(err, job));
        return false;
      });
  }

  _cancelJob(job) {
    this.debug(`Cancelling job ${job._id}`);

    const completedTime = moment().toISOString();
    const doc = {
      status: constants.JOB_STATUS_CANCELLED,
      completed_at: completedTime,
    };

    return this.client.update({
      index: job._index,
      type: job._type,
      id: job._id,
      version: job._version,
      body: { doc }
    })
      .then(() => true)
      .catch((err) => {
        if (err.statusCode === 409) return true;
        this.debug(`_cancelJob failed to update job ${job._id}`, err);
        this.emit(constants.EVENT_WORKER_FAIL_UPDATE_ERROR, this._formatErrorParams(err, job));
        return false;
      });
  }

  _formatOutput(output) {
    const unknownMime = false;
    const defaultOutput = null;
    const docOutput = {};

    if (typeof output === 'object' && output.content) {
      docOutput.content = output.content;
      docOutput.content_type = output.content_type || unknownMime;
      docOutput.max_size_reached = output.max_size_reached;
    } else {
      docOutput.content = output || defaultOutput;
      docOutput.content_type = unknownMime;
    }

    return docOutput;
  }

  _performJob(job) {
    this.debug(`Starting job ${job._id}`);

    const workerOutput = new Promise((resolve, reject) => {
      // run the worker's workerFn
      let isResolved = false;
      const cancellationToken = new CancellationToken();
      cancellationToken.on(() => {
        this._cancelJob(job);
      });
      this.processingJobCount += 1;
      Promise.resolve(this.workerFn.call(null, job._source.payload, cancellationToken))
        .then((res) => {
          isResolved = true;
          this.processingJobCount -= 1;
          resolve(res);
        })
        .catch((err) => {
          isResolved = true;
          this.processingJobCount -= 1;
          reject(err);
        });

      // fail if workerFn doesn't finish before timeout
      setTimeout(() => {
        if (isResolved) return;

        cancellationToken.cancel();
        this.processingJobCount -= 1;
        this.debug(`Timeout processing job ${job._id}`);
        reject(new WorkerTimeoutError(`Worker timed out, timeout = ${job._source.timeout}`, {
          timeout: job._source.timeout,
          jobId: job._id,
        }));
      }, job._source.timeout);
    });

    return workerOutput.then((output) => {
      // job execution was successful
      this.debug(`Completed job ${job._id}`);

      const completedTime = moment().toISOString();
      const docOutput = this._formatOutput(output);

      const doc = {
        status: constants.JOB_STATUS_COMPLETED,
        completed_at: completedTime,
        output: docOutput
      };

      return this.client.update({
        index: job._index,
        type: job._type,
        id: job._id,
        version: job._version,
        body: { doc }
      })
        .then(() => {
          const eventOutput = {
            job: formatJobObject(job),
            output: docOutput,
          };

          this.emit(constants.EVENT_WORKER_COMPLETE, eventOutput);
        })
        .catch((err) => {
          if (err.statusCode === 409) return false;
          this.debug(`Failure saving job output ${job._id}`, err);
          this.emit(constants.EVENT_WORKER_JOB_UPDATE_ERROR, this._formatErrorParams(err, job));
        });
    }, (jobErr) => {
      if (!jobErr) {
        jobErr = new UnspecifiedWorkerError('Unspecified worker error', {
          jobId: job._id,
        });
      }

      // job execution failed
      if (jobErr.name === 'WorkerTimeoutError') {
        this.debug(`Timeout on job ${job._id}`);
        this.emit(constants.EVENT_WORKER_JOB_TIMEOUT, this._formatErrorParams(jobErr, job));
        return;

      // append the jobId to the error
      } else {
        try {
          Object.assign(jobErr, { jobId: job._id });
        } catch (e) {
          // do nothing if jobId can not be appended
        }
      }

      this.debug(`Failure occurred on job ${job._id}`, jobErr);
      this.emit(constants.EVENT_WORKER_JOB_EXECUTION_ERROR, this._formatErrorParams(jobErr, job));
      return this._failJob(job, (jobErr.toString) ? jobErr.toString() : false);
    });
  }

  _startJobPolling() {
    if (!this._running) {
      return;
    }

    this._poller.start();
  }

  _stopJobPolling() {
    this._poller.stop();
  }

  _processPendingJobs() {
    return this._getPendingJobs()
      .then((jobs) => {
        return this._claimPendingJobs(jobs);
      });
  }

  _claimPendingJobs(jobs) {
    if (!jobs || jobs.length === 0) return;

    let claimed = 0;

    return jobs.reduce((chain, job) => {
      return chain.then((claimedJobs) => {
        // Apply capacity control to make sure there won't be more jobs processing than the capacity.
        if (claimed === (this.capacity - this.processingJobCount)) return claimedJobs;

        return this._claimJob(job)
          .then((claimResult) => {
            if (claimResult !== false) {
              claimed += 1;
              claimedJobs.push(claimResult);
              return claimedJobs;
            }
          });
      });
    }, Promise.resolve([]))
      .then((claimedJobs) => {
        if (!claimedJobs || claimedJobs.length === 0) {
          this.debug(`All ${jobs.length} jobs already claimed`);
          return;
        }
        this.debug(`Claimed ${claimedJobs.size} jobs`);
        return Promise.all(claimedJobs.map((job) => {
          return this._performJob(job);
        }));
      })
      .catch((err) => {
        this.debug('Error claiming jobs', err);
      });
  }

  _resetProcessingJobs() {
    const nowTime = moment().toISOString();
    const query = {
      query: {
        bool: {
          filter: {
            bool: {
              minimum_should_match: 1,
              must: { term: { jobtype: this.jobtype } },
              should: [
                {
                  bool: {
                    must: [
                      // Conditioned on the 'processing' jobs which have not
                      // expired yet.
                      { term: { status: 'processing' } },
                      { range: { process_expiration: { gt: nowTime } } }
                    ],
                  },
                },
              ],
            }
          }
        }
      },
      script: {
        source: `ctx._source.status = "${constants.JOB_STATUS_PENDING}"`,
        lang: 'painless',
      }
    };

    return this.client.updateByQuery({
      index: `${this.queue.index}-*`,
      version: true,
      body: query
    })
      .then((results) => {
        return results.updated;
      })
      .catch((err) => {
        this.debug('job querying failed', err);
        this.emit(constants.EVENT_WORKER_RESET_PROCESSING_JOB_ERROR, this._formatErrorParams(err));
        throw err;
      });
  }

  _getPendingJobs() {
    const nowTime = moment().toISOString();
    const query = {
      _source: {
        excludes: [ 'output.content' ]
      },
      query: {
        bool: {
          filter: {
            bool: {
              minimum_should_match: 1,
              must: { term: { jobtype: this.jobtype } },
              should: [
                { term: { status: 'pending' } },
                {
                  bool: {
                    must: [
                      { term: { status: 'processing' } },
                      { range: { process_expiration: { lte: nowTime } } }
                    ],
                  },
                },
              ],
            }
          }
        }
      },
      sort: [
        { priority: { order: 'asc' } },
        { created_at: { order: 'asc' } }
      ],
      size: this.checkSize
    };

    return this.client.search({
      index: `${this.queue.index}-*`,
      version: true,
      body: query
    })
      .then((results) => {
        const jobs = results.hits.hits;
        if (jobs.length > 0) {
          this.debug(`${jobs.length} outstanding jobs returned`);
        }
        return jobs;
      })
      .catch((err) => {
      // ignore missing indices errors
        if (err && err.status === 404) return [];

        this.debug('job querying failed', err);
        this.emit(constants.EVENT_WORKER_JOB_SEARCH_ERROR, this._formatErrorParams(err));
        throw err;
      });
  }
}
