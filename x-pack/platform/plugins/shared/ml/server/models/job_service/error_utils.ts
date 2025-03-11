/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { JOB_STATE, DATAFEED_STATE } from '../../../common/constants/states';
import type { JobAction } from '../../../common/constants/job_actions';

const REQUEST_TIMEOUT_NAME = 'RequestTimeout';
type ACTION_STATE = DATAFEED_STATE | JOB_STATE | JobAction;

export function isRequestTimeout(error: { name: string }) {
  return error.name === REQUEST_TIMEOUT_NAME;
}

export interface Results {
  [id: string]: {
    [status: string]: any;
    error?: any;
  };
}

// populate a results object with timeout errors
// for the ids which haven't already been set
export function fillResultsWithTimeouts(
  results: Results,
  id: string,
  ids: string[],
  status: ACTION_STATE
) {
  const action = getAction(status);
  const extra =
    ids.length - Object.keys(results).length > 1
      ? i18n.translate('xpack.ml.models.jobService.allOtherRequestsCancelledDescription', {
          defaultMessage: ' All other requests cancelled.',
        })
      : '';

  const error = {
    response: {
      error: {
        root_cause: [
          {
            reason: i18n.translate(
              'xpack.ml.models.jobService.requestToActionTimedOutErrorMessage',
              {
                defaultMessage: `Request to {action} ''{id}'' timed out.{extra}`,
                values: {
                  id,
                  action,
                  extra,
                },
              }
            ),
          },
        ],
      },
    },
  };

  return ids.reduce((acc, cur) => {
    if (results[cur] === undefined) {
      acc[cur] = {
        [status]: false,
        error,
      };
    } else {
      acc[cur] = results[cur];
    }
    return acc;
  }, {} as Results);
}

function getAction(status: ACTION_STATE) {
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
