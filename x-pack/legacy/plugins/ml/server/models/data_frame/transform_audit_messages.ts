/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ML_DF_NOTIFICATION_INDEX_PATTERN } from '../../../common/constants/index_patterns';
import { callWithRequestType } from '../../../common/types/kibana';
import { TransformMessage } from '../../../common/types/audit_message';

const SIZE = 500;

interface Message {
  _index: string;
  _type: string;
  _id: string;
  _score: null | number;
  _source: TransformMessage;
  sort?: any;
}

interface BoolQuery {
  bool: { [key: string]: any };
}

export function transformAuditMessagesProvider(callWithRequest: callWithRequestType) {
  // search for audit messages,
  // transformId is optional. without it, all transforms will be listed.
  async function getTransformAuditMessages(transformId: string) {
    const query: BoolQuery = {
      bool: {
        filter: [
          {
            bool: {
              must_not: {
                term: {
                  level: 'activity',
                },
              },
            },
          },
        ],
      },
    };

    // if no transformId specified, load all of the messages
    if (transformId !== undefined) {
      query.bool.filter.push({
        bool: {
          should: [
            {
              term: {
                transform_id: '', // catch system messages
              },
            },
            {
              term: {
                transform_id: transformId, // messages for specified transformId
              },
            },
          ],
        },
      });
    }

    try {
      const resp = await callWithRequest('search', {
        index: ML_DF_NOTIFICATION_INDEX_PATTERN,
        ignore_unavailable: true,
        rest_total_hits_as_int: true,
        size: SIZE,
        body: {
          sort: [{ timestamp: { order: 'desc' } }, { transform_id: { order: 'asc' } }],
          query,
        },
      });

      let messages = [];
      if (resp.hits.total !== 0) {
        messages = resp.hits.hits.map((hit: Message) => hit._source);
        messages.reverse();
      }
      return messages;
    } catch (e) {
      throw e;
    }
  }

  return {
    getTransformAuditMessages,
  };
}
