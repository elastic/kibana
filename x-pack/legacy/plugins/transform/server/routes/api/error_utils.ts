/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  TransformEndpointRequest,
  TransformEndpointResult,
} from '../../../public/app/hooks/use_api_types';

const REQUEST_TIMEOUT = 'RequestTimeout';

export function isRequestTimeout(error: any) {
  return error.displayName === REQUEST_TIMEOUT;
}

interface Params {
  results: TransformEndpointResult;
  id: string;
  items: TransformEndpointRequest[];
  action: string;
}

// populate a results object with timeout errors for the ids which haven't already been set
export function fillResultsWithTimeouts({ results, id, items, action }: Params) {
  const extra =
    items.length - Object.keys(results).length > 1
      ? i18n.translate(
          'xpack.transform.models.transformService.allOtherRequestsCancelledDescription',
          {
            defaultMessage: 'All other requests cancelled.',
          }
        )
      : '';

  const error = {
    response: {
      error: {
        root_cause: [
          {
            reason: i18n.translate(
              'xpack.transform.models.transformService.requestToActionTimedOutErrorMessage',
              {
                defaultMessage: `Request to {action} '{id}' timed out. {extra}`,
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

  const newResults: TransformEndpointResult = {};

  return items.reduce((accumResults, currentVal) => {
    if (results[currentVal.id] === undefined) {
      accumResults[currentVal.id] = {
        success: false,
        error,
      };
    } else {
      accumResults[currentVal.id] = results[currentVal.id];
    }
    return accumResults;
  }, newResults);
}
