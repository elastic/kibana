/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { i18n } from '@kbn/i18n';
import { JOB_STATE, DATAFEED_STATE } from '../../../common/constants/states';

const REQUEST_TIMEOUT = 'RequestTimeout';

export function isRequestTimeout(error) {
  return (error.displayName === REQUEST_TIMEOUT);
}

// populate a results object with timeout errors
// for the ids which haven't already been set
export function fillResultsWithTimeouts(results, id, ids, status) {
  const action = getAction(status);
  const extra = ((ids.length - Object.keys(results).length) > 1) ?
    i18n.translate('xpack.ml.models.jobService.allOtherRequestsCancelledDescription', {
      defaultMessage: ' All other requests cancelled.',
    }) : '';

  const error = {
    response: {
      error: {
        root_cause: [{
          reason: i18n.translate('xpack.ml.models.jobService.requestToActionTimedOutErrorMessage', {
            defaultMessage: `Request to {action} '{id}' timed out.{extra}`,
            values: {
              id,
              action,
              extra,
            },
          })
        }]
      }
    }
  };

  return ids.reduce((p, c) => {
    if (results[c] === undefined) {
      p[c] = {
        [status]: false,
        error
      };
    } else {
      p[c] = results[c];
    }
    return p;
  }, {});
}

function getAction(status) {
  let action = '';
  if (status === DATAFEED_STATE.STARTED) {
    action = 'start';
  } else if (status === DATAFEED_STATE.STOPPED) {
    action = 'stop';
  } else if (status === DATAFEED_STATE.DELETED) {
    action = 'delete';
  } else if (status === JOB_STATE.OPENED) {
    action = 'open';
  } else if (status === JOB_STATE.CLOSED) {
    action = 'close';
  }
  return action;
}
