/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from '../../../../typings/elasticsearch';
import {
  TRANSACTION_TYPE,
  ERROR_GROUP_ID,
  PROCESSOR_EVENT,
  TRANSACTION_NAME,
  SERVICE_NAME
} from '../../../../common/elasticsearch_fieldnames';
import { IUrlParams } from '../../../context/UrlParamsContext/types';

export function getBoolFilter(urlParams: IUrlParams) {
  const { start, end, serviceName, processorEvent } = urlParams;

  if (!start || !end) {
    throw new Error('Date range was not defined');
  }

  const boolFilter: ESFilter[] = [
    {
      range: {
        '@timestamp': {
          gte: new Date(start).getTime(),
          lte: new Date(end).getTime(),
          format: 'epoch_millis'
        }
      }
    }
  ];

  if (serviceName) {
    boolFilter.push({
      term: { [SERVICE_NAME]: serviceName }
    });
  }

  switch (processorEvent) {
    case 'transaction':
      boolFilter.push({
        term: { [PROCESSOR_EVENT]: 'transaction' }
      });

      if (urlParams.transactionName) {
        boolFilter.push({
          term: { [TRANSACTION_NAME]: urlParams.transactionName }
        });
      }

      if (urlParams.transactionType) {
        boolFilter.push({
          term: { [TRANSACTION_TYPE]: urlParams.transactionType }
        });
      }
      break;

    case 'error':
      boolFilter.push({
        term: { [PROCESSOR_EVENT]: 'error' }
      });

      if (urlParams.errorGroupId) {
        boolFilter.push({
          term: { [ERROR_GROUP_ID]: urlParams.errorGroupId }
        });
      }
      break;

    case 'metric':
      boolFilter.push({
        term: { [PROCESSOR_EVENT]: 'metric' }
      });
      break;

    default:
      boolFilter.push({
        bool: {
          should: [
            { term: { [PROCESSOR_EVENT]: 'error' } },
            { term: { [PROCESSOR_EVENT]: 'transaction' } },
            { term: { [PROCESSOR_EVENT]: 'metric' } }
          ]
        }
      });
  }

  return boolFilter;
}
