/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  replaceTokensInUrlValue,
  getUrlForRecord,
  isValidLabel,
  isValidTimeRange,
} from './custom_url_utils';
import { AnomalyRecordDoc } from '../../common/types/anomalies';
import {
  CustomUrlAnomalyRecordDoc,
  KibanaUrlConfig,
  UrlConfig,
} from '../../common/types/custom_urls';

describe('ML - custom URL utils', () => {
  const TEST_DOC: AnomalyRecordDoc = {
    job_id: 'farequote',
    result_type: 'record',
    probability: 6.533287347648861e-45,
    record_score: 93.84475,
    initial_record_score: 94.867922946384,
    bucket_span: 300,
    detector_index: 0,
    is_interim: false,
    timestamp: 1486656600000,
    partition_field_name: 'airline',
    partition_field_value: 'AAL',
    function: 'mean',
    function_description: 'mean',
    typical: [99.2329899996025],
    actual: [274.7279901504516],
    field_name: 'responsetime',
    influencers: [
      {
        influencer_field_name: 'airline',
        influencer_field_values: ['AAL'],
      },
    ],
    airline: ['AAL'],
  };

  const TEST_RECORD: CustomUrlAnomalyRecordDoc = {
    ...TEST_DOC,
    earliest: '2017-02-09T15:10:00.000Z',
    latest: '2017-02-09T17:15:00.000Z',
  };

  const TEST_RECORD_SPECIAL_CHARS = {
    ...TEST_DOC,
    earliest: '2017-02-09T15:10:00.000Z',
    latest: '2017-02-09T17:15:00.000Z',
    partition_field_value: '<>:;[}")',
    influencers: [
      {
        influencer_field_name: 'airline',
        influencer_field_values: ['<>:;[}")'],
      },
    ],
    airline: ['<>:;[}")'],
  };

  const TEST_RECORD_MULTIPLE_INFLUENCER_VALUES: CustomUrlAnomalyRecordDoc = {
    ...TEST_RECORD,
    influencers: [
      {
        influencer_field_name: 'airline',
        influencer_field_values: ['AAL', 'AWE'],
      },
    ],
    airline: ['AAL', 'AWE'],
  };

  const TEST_RECORD_NO_INFLUENCER_VALUES: CustomUrlAnomalyRecordDoc = {
    ...TEST_RECORD,
    influencers: [
      {
        influencer_field_name: 'airline',
        influencer_field_values: [],
      },
    ],
    airline: null,
  };

  const TEST_DASHBOARD_URL: KibanaUrlConfig = {
    url_name: 'Show dashboard',
    time_range: '1h',
    url_value:
      "kibana#/dashboard/5f112420-9fc6-11e8-9130-150552a4bef3?_g=(time:(from:'$earliest$',mode:absolute,to:'$latest$'))&_a=(filters:!(),query:(language:kuery,query:'airline:\"$airline$\"'))", // eslint-disable-line max-len
  };

  const TEST_DISCOVER_URL: KibanaUrlConfig = {
    url_name: 'Raw data',
    time_range: 'auto',
    url_value:
      "kibana#/discover?_g=(time:(from:'$earliest$',mode:absolute,to:'$latest$'))&_a=(index:bf6e5860-9404-11e8-8d4c-593f69c47267,query:(language:kuery,query:'airline:\"$airline$\"'))", // eslint-disable-line max-len
  };

  const TEST_DASHBOARD_LUCENE_URL: KibanaUrlConfig = {
    url_name: 'Show dashboard',
    time_range: '1h',
    url_value:
      "kibana#/dashboard/5f112420-9fc6-11e8-9130-150552a4bef3?_g=(time:(from:'$earliest$',mode:absolute,to:'$latest$'))&_a=(filters:!(),query:(language:lucene,query:'airline:\"$airline$\"'))", // eslint-disable-line max-len
  };

  const TEST_OTHER_URL: UrlConfig = {
    url_name: 'Show airline',
    url_value: 'http://airlinecodes.info/airline-code-$airline$',
  };

  const TEST_OTHER_URL_NO_TOKENS: UrlConfig = {
    url_name: 'Show docs',
    url_value: 'https://www.elastic.co/guide/index.html',
  };

  describe('replaceTokensInUrlValue', () => {
    test('replaces tokens as expected for a Kibana Dashboard type URL', () => {
      expect(replaceTokensInUrlValue(TEST_DASHBOARD_URL, 300, TEST_DOC, 'timestamp')).toBe(
        "kibana#/dashboard/5f112420-9fc6-11e8-9130-150552a4bef3?_g=(time:(from:'2017-02-09T15:10:00.000Z',mode:absolute,to:'2017-02-09T17:15:00.000Z'))&_a=(filters:!(),query:(language:kuery,query:'airline:\"AAL\"'))"
      ); // eslint-disable-line max-len
    });

    test('replaces tokens containing special characters as expected for a Kibana Dashboard type URL', () => {
      expect(
        replaceTokensInUrlValue(TEST_DASHBOARD_URL, 300, TEST_RECORD_SPECIAL_CHARS, 'timestamp')
      ).toBe(
        "kibana#/dashboard/5f112420-9fc6-11e8-9130-150552a4bef3?_g=(time:(from:'2017-02-09T15:10:00.000Z',mode:absolute,to:'2017-02-09T17:15:00.000Z'))&_a=(filters:!(),query:(language:kuery,query:'airline:\"%3C%3E%3A%3B%5B%7D%5C%22)\"'))"
      ); // eslint-disable-line max-len
    });

    test('replaces tokens containing special characters as expected for a Kibana Dashboard type URL where query language is lucene', () => {
      expect(
        replaceTokensInUrlValue(
          TEST_DASHBOARD_LUCENE_URL,
          300,
          TEST_RECORD_SPECIAL_CHARS,
          'timestamp'
        )
      ).toBe(
        "kibana#/dashboard/5f112420-9fc6-11e8-9130-150552a4bef3?_g=(time:(from:'2017-02-09T15:10:00.000Z',mode:absolute,to:'2017-02-09T17:15:00.000Z'))&_a=(filters:!(),query:(language:lucene,query:'airline:\"%5C%3C%5C%3E%5C%3A%3B%5C%5B%5C%7D%5C%22%5C)\"'))"
      ); // eslint-disable-line max-len
    });

    test('replaces tokens as expected for a Kibana Discover type URL', () => {
      expect(replaceTokensInUrlValue(TEST_DISCOVER_URL, 300, TEST_DOC, 'timestamp')).toBe(
        "kibana#/discover?_g=(time:(from:'2017-02-09T16:05:00.000Z',mode:absolute,to:'2017-02-09T16:20:00.000Z'))&_a=(index:bf6e5860-9404-11e8-8d4c-593f69c47267,query:(language:kuery,query:'airline:\"AAL\"'))"
      ); // eslint-disable-line max-len
    });

    test('replaces token with multiple influencer values', () => {
      expect(
        replaceTokensInUrlValue(
          TEST_DISCOVER_URL,
          300,
          TEST_RECORD_MULTIPLE_INFLUENCER_VALUES,
          'timestamp'
        )
      ).toBe(
        "kibana#/discover?_g=(time:(from:'2017-02-09T16:05:00.000Z',mode:absolute,to:'2017-02-09T16:20:00.000Z'))&_a=(index:bf6e5860-9404-11e8-8d4c-593f69c47267,query:(language:kuery,query:'(airline:\"AAL\" OR airline:\"AWE\")'))"
      ); // eslint-disable-line max-len
    });

    test('removes tokens with no influencer values', () => {
      expect(
        replaceTokensInUrlValue(
          TEST_DISCOVER_URL,
          300,
          TEST_RECORD_NO_INFLUENCER_VALUES,
          'timestamp'
        )
      ).toBe(
        "kibana#/discover?_g=(time:(from:'2017-02-09T16:05:00.000Z',mode:absolute,to:'2017-02-09T16:20:00.000Z'))&_a=(index:bf6e5860-9404-11e8-8d4c-593f69c47267,query:(language:kuery,query:''))"
      ); // eslint-disable-line max-len
    });

    test('replaces tokens as expected for other type URL with tokens', () => {
      expect(replaceTokensInUrlValue(TEST_OTHER_URL, 300, TEST_DOC, 'timestamp')).toBe(
        'http://airlinecodes.info/airline-code-AAL'
      );
    });

    test('replaces tokens as expected for other type URL without tokens', () => {
      expect(replaceTokensInUrlValue(TEST_OTHER_URL_NO_TOKENS, 300, TEST_DOC, 'timestamp')).toBe(
        'https://www.elastic.co/guide/index.html'
      );
    });

    test('replaces tokens outside of a query', () => {
      const TEST_DOC_WITH_METHOD: AnomalyRecordDoc = {
        ...TEST_DOC,
        method: ['POST'],
      };
      const TEST_MULTIPLE_NON_QUERY_TOKENS: UrlConfig = {
        url_name: 'no_query',
        url_value: `kibana#/dashboard/b3ad9930-db86-11e9-b5d5-e3a9ca224c61?_g=(filters:!(),time:(from:'2018-12-17T00:00:00.000Z',mode:absolute,to:'2018-12-17T09:00:00.000Z'))&_a=(description:'',filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'7e06e310-dae4-11e9-8260-995f99197467',key:method,negate:!f,params:(query:$method$),type:phrase,value:$method$),query:(match:(method:(query:$method$,type:phrase))))))`,
      };
      expect(
        replaceTokensInUrlValue(
          TEST_MULTIPLE_NON_QUERY_TOKENS,
          300,
          TEST_DOC_WITH_METHOD,
          'timestamp'
        )
      ).toBe(
        `kibana#/dashboard/b3ad9930-db86-11e9-b5d5-e3a9ca224c61?_g=(filters:!(),time:(from:'2018-12-17T00:00:00.000Z',mode:absolute,to:'2018-12-17T09:00:00.000Z'))&_a=(description:'',filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'7e06e310-dae4-11e9-8260-995f99197467',key:method,negate:!f,params:(query:POST),type:phrase,value:POST),query:(match:(method:(query:POST,type:phrase))))))`
      );
    });

    // eslint-disable-next-line ban/ban
    test('truncates long queries', () => {
      const TEST_DOC_WITH_METHOD: AnomalyRecordDoc = {
        ...TEST_DOC,
        influencers: [
          {
            influencer_field_name: 'action',
            influencer_field_values: ['dashboard-widgets', 'edit', 'delete'],
          },
          {
            influencer_field_name: 'method',
            influencer_field_values: ['POST'],
          },
          {
            influencer_field_name: 'clientip',
            influencer_field_values: ['92.20.59.36', '92.20.59.41'],
          },
        ],
        action: ['dashboard-widgets', 'edit', 'delete'],
        clientip: ['92.20.59.36', '92.20.59.41'],
        referer: ['http://www.example.com/wp-admin/post.php?post=51&action=edit'],
        method: 'POST',
      };
      const TEST_MULTIPLE_NON_QUERY_TOKENS: UrlConfig = {
        url_name: 'massive_url',
        url_value: `kibana#/discover/11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61?_g=(filters:!(),time:(from:'$earliest$',mode:absolute,to:'$latest$'))&_a=(columns:!(_source),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'7e06e310-dae4-11e9-8260-995f99197467',key:method,negate:!f,params:(query:$method$),type:phrase,value:$method$),query:(match:(method:(query:$method$,type:phrase))))),index:'7e06e310-dae4-11e9-8260-995f99197467',interval:auto,query:(language:kuery,query:'clientip:$clientip$ and action:$action$ and referer:$referer$'),sort:!(!('@timestamp',desc)))`,
      };
      expect(
        replaceTokensInUrlValue(
          TEST_MULTIPLE_NON_QUERY_TOKENS,
          300,
          TEST_DOC_WITH_METHOD,
          'timestamp'
        )
      ).toBe(
        `kibana#/discover/11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61?_g=(filters:!(),time:(from:'2017-02-09T16:05:00.000Z',mode:absolute,to:'2017-02-09T16:20:00.000Z'))&_a=(columns:!(_source),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'7e06e310-dae4-11e9-8260-995f99197467',key:method,negate:!f,params:(query:POST),type:phrase,value:POST),query:(match:(method:(query:POST,type:phrase))))),index:'7e06e310-dae4-11e9-8260-995f99197467',interval:auto,query:(language:kuery,query:'(clientip:\"92.20.59.36\" OR clientip:\"92.20.59.41\") AND (action:\"dashboard-widgets\" OR action:\"edit\" OR action:\"delete\")'),sort:!(!('@timestamp',desc)))`
      );
    });
  });

  describe('getUrlForRecord', () => {
    test('returns expected URL for a Kibana Dashboard type URL', () => {
      expect(getUrlForRecord(TEST_DASHBOARD_URL, TEST_RECORD)).toBe(
        "kibana#/dashboard/5f112420-9fc6-11e8-9130-150552a4bef3?_g=(time:(from:'2017-02-09T15:10:00.000Z',mode:absolute,to:'2017-02-09T17:15:00.000Z'))&_a=(filters:!(),query:(language:kuery,query:'airline:\"AAL\"'))"
      ); // eslint-disable-line max-len
    });

    test('returns expected URL for a Kibana Discover type URL', () => {
      expect(getUrlForRecord(TEST_DISCOVER_URL, TEST_RECORD)).toBe(
        "kibana#/discover?_g=(time:(from:'2017-02-09T15:10:00.000Z',mode:absolute,to:'2017-02-09T17:15:00.000Z'))&_a=(index:bf6e5860-9404-11e8-8d4c-593f69c47267,query:(language:kuery,query:'airline:\"AAL\"'))"
      ); // eslint-disable-line max-len
    });

    test('returns expected URL for a Kibana Discover type URL when record field contains special characters', () => {
      expect(getUrlForRecord(TEST_DISCOVER_URL, TEST_RECORD_SPECIAL_CHARS)).toBe(
        "kibana#/discover?_g=(time:(from:'2017-02-09T15:10:00.000Z',mode:absolute,to:'2017-02-09T17:15:00.000Z'))&_a=(index:bf6e5860-9404-11e8-8d4c-593f69c47267,query:(language:kuery,query:'airline:\"%3C%3E%3A%3B%5B%7D%5C%22)\"'))"
      ); // eslint-disable-line max-len
    });

    test('returns expected URL for other type URL', () => {
      expect(getUrlForRecord(TEST_OTHER_URL, TEST_RECORD)).toBe(
        'http://airlinecodes.info/airline-code-AAL'
      );
    });
  });

  describe('isValidLabel', () => {
    const testUrls = [TEST_DASHBOARD_URL, TEST_DISCOVER_URL, TEST_OTHER_URL];
    test('returns true for a unique label', () => {
      expect(isValidLabel('Drilldown dashboard', testUrls)).toBe(true);
    });

    test('returns false for a duplicate label', () => {
      expect(isValidLabel('Show dashboard', testUrls)).toBe(false);
    });

    test('returns false for a blank label', () => {
      expect(isValidLabel('', testUrls)).toBe(false);
    });
  });

  describe('isValidTimeRange', () => {
    test('returns true for valid values', () => {
      expect(isValidTimeRange('1h')).toBe(true);
      expect(isValidTimeRange('6h')).toBe(true);
      expect(isValidTimeRange('5m')).toBe(true);
      expect(isValidTimeRange('auto')).toBe(true);
      expect(isValidTimeRange('')).toBe(true);
    });

    test('returns false for invalid values', () => {
      expect(isValidTimeRange('1hour')).toBe(false);
      expect(isValidTimeRange('uato')).toBe(false);
      expect(isValidTimeRange('AUTO')).toBe(false);
    });
  });
});
