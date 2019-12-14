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
import { CancellationToken } from '../../../common/cancellation_token';
import { Poller } from '../../../../../common/poller';

const puid = new Puid();

export function formatJobObject(job) {
  return {
    index: job._index,
    id: job._id,
  };
}

export function getUpdatedDocPath(response) {
  const { _index: ind, _type: type = '_doc', _id: id } = response;
  return `/${ind}/${type}/${id}`;
}

const MAX_PARTIAL_ERROR_LENGTH = 1000; // 1000 of beginning, 1000 of end
const ERROR_PARTIAL_SEPARATOR = '...';
const MAX_ERROR_LENGTH = MAX_PARTIAL_ERROR_LENGTH * 2 + ERROR_PARTIAL_SEPARATOR.length;

function getLogger(opts, id, logLevel) {
  return (msg, err) => {
    /*
     * This does not get the logger instance from queue.registerWorker in the createWorker function.
     * The logger instance in the Equeue lib comes from createTaggedLogger, so logLevel tags are passed differently
     */
    const logger = opts.logger || function() {};
    const message = `${id} - ${msg}`;
    const tags = [logLevel];

    if (err) {
      // The error message string could be very long if it contains the request
      // body of a request that was too large for Elasticsearch.
      // This takes a partial version of the error message without scanning
      // every character of the string, which would block Node.
      const errString = `${message}: ${err.stack ? err.stack : err}`;
      const errLength = errString.length;
      const subStr = String.prototype.substring.bind(errString);
      if (errLength > MAX_ERROR_LENGTH) {
        const partialError =
          subStr(0, MAX_PARTIAL_ERROR_LENGTH) +
          ERROR_PARTIAL_SEPARATOR +
          subStr(errLength - MAX_PARTIAL_ERROR_LENGTH);

        logger(partialError, tags);
        logger(
          `A partial version of the entire error message was logged. ` +
            `The entire error message length is: ${errLength} characters.`,
          tags
        );
      } else {
        logger(errString, tags);
      }
      return;
    }

    logger(message, tags);
  };
}

export class Worker extends events.EventEmitter {
  constructor(queue, type, workerFn, opts) {
    if (typeof type !== 'string') throw new Error('type must be a string');
    if (typeof workerFn !== 'function') throw new Error('workerFn must be a function');
    if (typeof opts !== 'object') throw new Error('opts must be an object');
    if (typeof opts.interval !== 'number') throw new Error('opts.interval must be a number');
    if (typeof opts.intervalErrorMultiplier !== 'number')
      throw new Error('opts.intervalErrorMultiplier must be a number');

    super();

    this.id = puid.generate();
    this.kibanaId = opts.kibanaId;
    this.kibanaName = opts.kibanaName;
    this.queue = queue;
    this._client = this.queue.client;
    this.jobtype = type;
    this.workerFn = workerFn;
    this.checkSize = opts.size || 10;

    this.debug = getLogger(opts, this.id, 'debug');
    this.warn = getLogger(opts, this.id, 'warning');
    this.error = getLogger(opts, this.id, 'error');
    this.info = getLogger(opts, this.id, 'info');

    this._running = true;
    this.debug(`Created worker for ${this.jobtype} jobs`);

    this._poller = new Poller({
      functionToPoll: () => {
        return this._processPendingJobs();
      },
      pollFrequencyInMillis: opts.interval,
      trailing: true,
      continuePollingOnError: true,
      pollFrequencyErrorMultiplier: opts.intervalErrorMultiplier,
    });
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
      const msg = !job._source.output
        ? `Max attempts reached (${job._source.max_attempts})`
        : false;
      return this._failJob(job, msg).then(() => false);
    }

    const doc = {
      attempts: attempts,
      started_at: startTime,
      process_expiration: expirationTime,
      status: constants.JOB_STATUS_PROCESSING,
      kibana_id: this.kibanaId,
      kibana_name: this.kibanaName,
    };

    return this._client
      .callWithInternalUser('update', {
        index: job._index,
        id: job._id,
        if_seq_no: job._seq_no,
        if_primary_term: job._primary_term,
        body: { doc },
      })
      .then(response => {
        this.info(`Job marked as claimed: ${getUpdatedDocPath(response)}`);
        const updatedJob = {
          ...job,
          ...response,
        };
        updatedJob._source = {
          ...job._source,
          ...doc,
        };
        return updatedJob;
      });
  }

  _failJob(job, output = false) {
    this.warn(`Failing job ${job._id}`);

    const completedTime = moment().toISOString();
    const docOutput = this._formatOutput(output);
    const doc = {
      status: constants.JOB_STATUS_FAILED,
      completed_at: completedTime,
      output: docOutput,
    };

    this.emit(constants.EVENT_WORKER_JOB_FAIL, {
      job: formatJobObject(job),
      worker: this.toJSON(),
      output: docOutput,
    });

    return this._client
      .callWithInternalUser('update', {
        index: job._index,
        id: job._id,
        if_seq_no: job._seq_no,
        if_primary_term: job._primary_term,
        body: { doc },
      })
      .then(response => {
        this.info(`Job marked as failed: ${getUpdatedDocPath(response)}`);
      })
      .catch(err => {
        if (err.statusCode === 409) return true;
        this.error(`_failJob failed to update job ${job._id}`, err);
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
      docOutput.size = output.size;
      docOutput.csv_contains_formulas = output.csv_contains_formulas;
    } else {
      docOutput.content = output || defaultOutput;
      docOutput.content_type = unknownMime;
    }

    return docOutput;
  }

  _performJob(job) {
    this.info(`Starting job`);

    const workerOutput = new Promise((resolve, reject) => {
      // run the worker's workerFn
      let isResolved = false;
      const cancellationToken = new CancellationToken();
      const jobSource = job._source;

      Promise.resolve(this.workerFn.call(null, job, jobSource.payload, cancellationToken))
        .then(res => {
          // job execution was successful
          this.info(`Job execution completed successfully`);

          isResolved = true;
          resolve(res);
        })
        .catch(err => {
          isResolved = true;
          reject(err);
        });

      // fail if workerFn doesn't finish before timeout
      const { timeout } = jobSource;
      setTimeout(() => {
        if (isResolved) return;

        cancellationToken.cancel();
        this.warn(`Timeout processing job ${job._id}`);
        reject(
          new WorkerTimeoutError(`Worker timed out, timeout = ${timeout}`, {
            jobId: job._id,
            timeout,
          })
        );
      }, timeout);
    });

    return workerOutput.then(
      output => {
        const completedTime = moment().toISOString();
        const docOutput = this._formatOutput(output);

        const doc = {
          status: constants.JOB_STATUS_COMPLETED,
          completed_at: completedTime,
          output: docOutput,
        };

        return this._client
          .callWithInternalUser('update', {
            index: job._index,
            id: job._id,
            if_seq_no: job._seq_no,
            if_primary_term: job._primary_term,
            body: { doc },
          })
          .then(response => {
            const eventOutput = {
              job: formatJobObject(job),
              output: docOutput,
            };
            this.emit(constants.EVENT_WORKER_COMPLETE, eventOutput);

            this.info(`Job data saved successfully: ${getUpdatedDocPath(response)}`);
          })
          .catch(err => {
            if (err.statusCode === 409) return false;
            this.error(`Failure saving job output ${job._id}`, err);
            this.emit(constants.EVENT_WORKER_JOB_UPDATE_ERROR, this._formatErrorParams(err, job));
            return this._failJob(job, err.message ? err.message : false);
          });
      },
      jobErr => {
        if (!jobErr) {
          jobErr = new UnspecifiedWorkerError('Unspecified worker error', {
            jobId: job._id,
          });
        }

        // job execution failed
        if (jobErr.name === 'WorkerTimeoutError') {
          this.warn(`Timeout on job ${job._id}`);
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

        this.error(`Failure occurred on job ${job._id}`, jobErr);
        this.emit(constants.EVENT_WORKER_JOB_EXECUTION_ERROR, this._formatErrorParams(jobErr, job));
        return this._failJob(job, jobErr.toString ? jobErr.toString() : false);
      }
    );
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
    return this._getPendingJobs().then(jobs => {
      return this._claimPendingJobs(jobs);
    });
  }

  _claimPendingJobs(jobs) {
    if (!jobs || jobs.length === 0) return;

    let claimed = false;

    // claim a single job, stopping after first successful claim
    return jobs
      .reduce((chain, job) => {
        return chain.then(claimedJob => {
          // short-circuit the promise chain if a job has been claimed
          if (claimed) return claimedJob;

          return this._claimJob(job)
            .then(claimResult => {
              claimed = true;
              return claimResult;
            })
            .catch(err => {
              if (err.statusCode === 409) {
                this.warn(
                  `_claimPendingJobs encountered a version conflict on updating pending job ${job._id}`,
                  err
                );
                return; // continue reducing and looking for a different job to claim
              }
              this.emit(constants.EVENT_WORKER_JOB_CLAIM_ERROR, this._formatErrorParams(err, job));
              return Promise.reject(err);
            });
        });
      }, Promise.resolve())
      .then(claimedJob => {
        if (!claimedJob) {
          this.debug(`Found no claimable jobs out of ${jobs.length} total`);
          return;
        }
        return this._performJob(claimedJob);
      })
      .catch(err => {
        this.error('Error claiming jobs', err);
        return Promise.reject(err);
      });
  }

  _getPendingJobs() {
    const nowTime = moment().toISOString();
    const query = {
      seq_no_primary_term: true,
      _source: {
        excludes: ['output.content'],
      },
      query: {
        bool: {
          filter: {
            bool: {
              minimum_should_match: 1,
              should: [
                { term: { status: 'pending' } },
                {
                  bool: {
                    must: [
                      { term: { status: 'processing' } },
                      { range: { process_expiration: { lte: nowTime } } },
                    ],
                  },
                },
              ],
            },
          },
        },
      },
      sort: [{ priority: { order: 'asc' } }, { created_at: { order: 'asc' } }],
      size: this.checkSize,
    };

    return this._client
      .callWithInternalUser('search', {
        index: `${this.queue.index}-*`,
        body: query,
      })
      .then(results => {
        const jobs = results.hits.hits;
        if (jobs.length > 0) {
          this.debug(`${jobs.length} outstanding jobs returned`);
        }
        return jobs;
      })
      .catch(err => {
        // ignore missing indices errors
        if (err && err.status === 404) return [];

        this.error('job querying failed', err);
        this.emit(constants.EVENT_WORKER_JOB_SEARCH_ERROR, this._formatErrorParams(err));
        throw err;
      });
  }
}
