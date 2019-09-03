/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ML_DF_NOTIFICATION_INDEX_PATTERN } from '../../../common/constants/index_patterns';
import { callWithRequestType } from '../../../common/types/kibana';
import { AnalyticsMessage } from '../../../common/types/audit_message';

const SIZE = 50;

interface Message {
  _index: string;
  _type: string;
  _id: string;
  _score: null | number;
  _source: AnalyticsMessage;
  sort?: any;
}

interface BoolQuery {
  bool: { [key: string]: any };
}

export function analyticsAuditMessagesProvider(callWithRequest: callWithRequestType) {
  // search for audit messages,
  // analyticsId is optional. without it, all analytics will be listed.
  async function getAnalyticsAuditMessages(analyticsId: string) {
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

    // if no analyticsId specified, load all of the messages
    if (analyticsId !== undefined) {
      query.bool.filter.push({
        bool: {
          should: [
            {
              term: {
                analytics_id: '', // catch system messages
              },
            },
            {
              term: {
                analytics_id: analyticsId, // messages for specified analyticsId
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
          sort: [{ timestamp: { order: 'desc' } }, { analytics_id: { order: 'asc' } }],
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
    getAnalyticsAuditMessages,
  };
}
