/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { JOB_STATE, DATAFEED_STATE } from '../../../common/constants/states';
import { fillResultsWithTimeouts, isRequestTimeout } from './error_utils';

export function datafeedsProvider(callWithRequest) {
  async function forceStartDatafeeds(datafeedIds, start, end) {
    const jobIds = await getJobIdsByDatafeedId();
    const doStartsCalled = datafeedIds.reduce((p, c) => {
      p[c] = false;
      return p;
    }, {});

    const results = {};

    async function doStart(datafeedId) {
      if (doStartsCalled[datafeedId] === false) {
        doStartsCalled[datafeedId] = true;
        try {
          await startDatafeed(datafeedId, start, end);
          return { started: true };
        } catch (error) {
          return { started: false, error };
        }
      }
    }

    for (const datafeedId of datafeedIds) {
      const jobId = jobIds[datafeedId];
      if (jobId !== undefined) {
        try {
          if (await openJob(jobId)) {
            results[datafeedId] = await doStart(datafeedId);
          }
        } catch (error) {
          if (isRequestTimeout(error)) {
            // if the open request times out, start the datafeed anyway
            // then break out of the loop so no more requests are fired.
            // use fillResultsWithTimeouts to add a timeout error to each
            // remaining job
            results[datafeedId] = await doStart(datafeedId);
            return fillResultsWithTimeouts(results, datafeedId, datafeedIds, JOB_STATE.OPENED);
          }
          results[datafeedId] = { started: false, error };
        }
      } else {
        results[datafeedId] = {
          started: false,
          error: i18n.translate('xpack.ml.models.jobService.jobHasNoDatafeedErrorMessage', {
            defaultMessage: 'Job has no datafeed',
          }),
        };
      }
    }

    return results;
  }

  async function openJob(jobId) {
    let opened = false;
    try {
      const resp = await callWithRequest('ml.openJob', { jobId });
      opened = resp.opened;
    } catch (error) {
      if (error.statusCode === 409) {
        opened = true;
      } else {
        throw error;
      }
    }
    return opened;
  }

  async function startDatafeed(datafeedId, start, end) {
    return callWithRequest('ml.startDatafeed', { datafeedId, start, end });
  }

  async function stopDatafeeds(datafeedIds) {
    const results = {};

    for (const datafeedId of datafeedIds) {
      try {
        results[datafeedId] = await callWithRequest('ml.stopDatafeed', { datafeedId });
      } catch (error) {
        if (isRequestTimeout(error)) {
          return fillResultsWithTimeouts(results, datafeedId, datafeedIds, DATAFEED_STATE.STOPPED);
        }
      }
    }

    return results;
  }

  async function forceDeleteDatafeed(datafeedId) {
    return callWithRequest('ml.deleteDatafeed', { datafeedId, force: true });
  }

  async function getDatafeedIdsByJobId() {
    const datafeeds = await callWithRequest('ml.datafeeds');
    return datafeeds.datafeeds.reduce((p, c) => {
      p[c.job_id] = c.datafeed_id;
      return p;
    }, {});
  }

  async function getJobIdsByDatafeedId() {
    const datafeeds = await callWithRequest('ml.datafeeds');
    return datafeeds.datafeeds.reduce((p, c) => {
      p[c.datafeed_id] = c.job_id;
      return p;
    }, {});
  }

  return {
    forceStartDatafeeds,
    stopDatafeeds,
    forceDeleteDatafeed,
    getDatafeedIdsByJobId,
    getJobIdsByDatafeedId,
  };
}
