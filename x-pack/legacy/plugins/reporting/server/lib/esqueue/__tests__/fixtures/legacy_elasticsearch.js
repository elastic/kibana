import { uniqueId, times, random } from 'lodash';
import * as legacyElasticsearch from 'elasticsearch';

import { constants } from '../../constants';

export function ClientMock() {
  this.callWithInternalUser = (endpoint, params = {}, ...rest) => {
    if (endpoint === 'indices.create') {
      return Promise.resolve({ acknowledged: true });
    }

    if (endpoint === 'indices.exists') {
      return Promise.resolve(false);
    }

    if (endpoint === 'index') {
      const shardCount = 2;
      return Promise.resolve({
        _index: params.index || 'index',
        _id: params.id || uniqueId('testDoc'),
        _seq_no: 1,
        _primary_term: 1,
        _shards: { total: shardCount, successful: shardCount, failed: 0 },
        created: true
      });
    }

    if (endpoint === 'get') {
      if (params === legacyElasticsearch.errors.NotFound) return legacyElasticsearch.errors.NotFound;

      const _source = {
        jobtype: 'jobtype',
        created_by: false,

        payload: {
          id: 'sample-job-1',
          now: 'Mon Apr 25 2016 14:13:04 GMT-0700 (MST)'
        },

        priority: 10,
        timeout: 10000,
        created_at: '2016-04-25T21:13:04.738Z',
        attempts: 0,
        max_attempts: 3,
        status: 'pending',
        ...(rest[0] || {})
      };

      return Promise.resolve({
        _index: params.index || 'index',
        _id: params.id || 'AVRPRLnlp7Ur1SZXfT-T',
        _seq_no: params._seq_no || 1,
        _primary_term: params._primary_term || 1,
        found: true,
        _source: _source
      });
    }

    if (endpoint === 'search') {
      const [count = 5, source = {}] = rest;
      const hits = times(count, () => {
        return {
          _index: params.index || 'index',
          _id: uniqueId('documentId'),
          _seq_no: random(1, 5),
          _primar_term: random(1, 5),
          _score: null,
          _source: {
            created_at: new Date().toString(),
            number: random(0, count, true),
            ...source
          }
        };
      });
      return Promise.resolve({
        took: random(0, 10),
        timed_out: false,
        _shards: {
          total: 5,
          successful: 5,
          failed: 0
        },
        hits: {
          total: count,
          max_score: null,
          hits: hits
        }
      });
    }

    if (endpoint === 'update') {
      const shardCount = 2;
      return Promise.resolve({
        _index: params.index || 'index',
        _id: params.id || uniqueId('testDoc'),
        _seq_no: params.if_seq_no + 1 || 2,
        _primary_term: params.if_primary_term + 1 || 2,
        _shards: { total: shardCount, successful: shardCount, failed: 0 },
        created: true
      });
    }

    return Promise.resolve();
  };

  this.transport = {};
}
