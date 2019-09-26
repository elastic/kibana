/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import expect from '@kbn/expect';
import {
  replaceTokensInUrlValue,
  getUrlForRecord,
  isValidLabel,
  isValidTimeRange,
} from '../custom_url_utils';


describe('ML - custom URL utils', () => {

  const TEST_DOC = {
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
        influencer_field_values: ['AAL']
      }
    ],
    airline: ['AAL'],
  };

  const TEST_RECORD = {
    ...TEST_DOC,
    earliest: '2017-02-09T15:10:00.000Z',
    latest: '2017-02-09T17:15:00.000Z'
  };

  const TEST_RECORD_SPECIAL_CHARS = {
    ...TEST_DOC,
    earliest: '2017-02-09T15:10:00.000Z',
    latest: '2017-02-09T17:15:00.000Z',
    partition_field_value: '<>:;[}")',
    influencers: [
      {
        influencer_field_name: 'airline',
        influencer_field_values: ['<>:;[}")']
      }
    ],
    airline: ['<>:;[}")'],
  };

  const TEST_DASHBOARD_URL = {
    url_name: 'Show dashboard',
    time_range: '1h',
    url_value: 'kibana#/dashboard/5f112420-9fc6-11e8-9130-150552a4bef3?_g=(time:(from:\'$earliest$\',mode:absolute,to:\'$latest$\'))&_a=(filters:!(),query:(language:kuery,query:\'airline:\"$airline$\"\'))' // eslint-disable-line max-len
  };

  const TEST_DISCOVER_URL = {
    url_name: 'Raw data',
    time_range: 'auto',
    url_value: 'kibana#/discover?_g=(time:(from:\'$earliest$\',mode:absolute,to:\'$latest$\'))&_a=(index:bf6e5860-9404-11e8-8d4c-593f69c47267,query:(language:kuery,query:\'airline:\"$airline$\"\'))' // eslint-disable-line max-len
  };

  const TEST_DASHBOARD_LUCENE_URL = {
    url_name: 'Show dashboard',
    time_range: '1h',
    url_value: 'kibana#/dashboard/5f112420-9fc6-11e8-9130-150552a4bef3?_g=(time:(from:\'$earliest$\',mode:absolute,to:\'$latest$\'))&_a=(filters:!(),query:(language:lucene,query:\'airline:\"$airline$\"\'))' // eslint-disable-line max-len
  };

  const TEST_OTHER_URL = {
    url_name: 'Show airline',
    url_value: 'http://airlinecodes.info/airline-code-$airline$'
  };

  const TEST_OTHER_URL_NO_TOKENS = {
    url_name: 'Show docs',
    url_value: 'https://www.elastic.co/guide/index.html'
  };


  describe('replaceTokensInUrlValue', () => {
    it('replaces tokens as expected for a Kibana Dashboard type URL', () => {
      expect(replaceTokensInUrlValue(TEST_DASHBOARD_URL, 300, TEST_DOC, 'timestamp')).to.be('kibana#/dashboard/5f112420-9fc6-11e8-9130-150552a4bef3?_g=(time:(from:\'2017-02-09T15:10:00.000Z\',mode:absolute,to:\'2017-02-09T17:15:00.000Z\'))&_a=(filters:!(),query:(language:kuery,query:\'airline:"AAL"\'))');  // eslint-disable-line max-len
    });

    it('replaces tokens containing special characters as expected for a Kibana Dashboard type URL', () => {
      expect(replaceTokensInUrlValue(TEST_DASHBOARD_URL, 300, TEST_RECORD_SPECIAL_CHARS, 'timestamp')).to.be('kibana#/dashboard/5f112420-9fc6-11e8-9130-150552a4bef3?_g=(time:(from:\'2017-02-09T15:10:00.000Z\',mode:absolute,to:\'2017-02-09T17:15:00.000Z\'))&_a=(filters:!(),query:(language:kuery,query:\'airline:"%3C%3E%3A%3B%5B%7D%5C%22)"\'))');  // eslint-disable-line max-len
    });

    it('replaces tokens containing special characters as expected for a Kibana Dashboard type URL where query language is lucene', () => {
      expect(replaceTokensInUrlValue(TEST_DASHBOARD_LUCENE_URL, 300, TEST_RECORD_SPECIAL_CHARS, 'timestamp')).to.be('kibana#/dashboard/5f112420-9fc6-11e8-9130-150552a4bef3?_g=(time:(from:\'2017-02-09T15:10:00.000Z\',mode:absolute,to:\'2017-02-09T17:15:00.000Z\'))&_a=(filters:!(),query:(language:lucene,query:\'airline:"%5C%3C%5C%3E%5C%3A%3B%5C%5B%5C%7D%5C%22%5C)"\'))');  // eslint-disable-line max-len
    });

    it('replaces tokens as expected for a Kibana Discover type URL', () => {
      expect(replaceTokensInUrlValue(TEST_DISCOVER_URL, 300, TEST_DOC, 'timestamp')).to.be('kibana#/discover?_g=(time:(from:\'2017-02-09T16:05:00.000Z\',mode:absolute,to:\'2017-02-09T16:20:00.000Z\'))&_a=(index:bf6e5860-9404-11e8-8d4c-593f69c47267,query:(language:kuery,query:\'airline:"AAL"\'))');  // eslint-disable-line max-len
    });

    it('replaces tokens as expected for other type URL with tokens', () => {
      expect(replaceTokensInUrlValue(TEST_OTHER_URL, 300, TEST_DOC, 'timestamp')).to.be('http://airlinecodes.info/airline-code-AAL');
    });

    it('replaces tokens as expected for other type URL without tokens', () => {
      expect(replaceTokensInUrlValue(TEST_OTHER_URL_NO_TOKENS, 300, TEST_DOC, 'timestamp')).to.be('https://www.elastic.co/guide/index.html');
    });

  });

  describe('getUrlForRecord', () => {
    it('returns expected URL for a Kibana Dashboard type URL', () => {
      expect(getUrlForRecord(TEST_DASHBOARD_URL, TEST_RECORD)).to.be('kibana#/dashboard/5f112420-9fc6-11e8-9130-150552a4bef3?_g=(time:(from:\'2017-02-09T15:10:00.000Z\',mode:absolute,to:\'2017-02-09T17:15:00.000Z\'))&_a=(filters:!(),query:(language:kuery,query:\'airline:"AAL"\'))');  // eslint-disable-line max-len
    });

    it('returns expected URL for a Kibana Discover type URL', () => {
      expect(getUrlForRecord(TEST_DISCOVER_URL, TEST_RECORD)).to.be('kibana#/discover?_g=(time:(from:\'2017-02-09T15:10:00.000Z\',mode:absolute,to:\'2017-02-09T17:15:00.000Z\'))&_a=(index:bf6e5860-9404-11e8-8d4c-593f69c47267,query:(language:kuery,query:\'airline:"AAL"\'))');  // eslint-disable-line max-len
    });

    it('returns expected URL for a Kibana Discover type URL when record field contains special characters', () => {
      expect(getUrlForRecord(TEST_DISCOVER_URL, TEST_RECORD_SPECIAL_CHARS)).to.be('kibana#/discover?_g=(time:(from:\'2017-02-09T15:10:00.000Z\',mode:absolute,to:\'2017-02-09T17:15:00.000Z\'))&_a=(index:bf6e5860-9404-11e8-8d4c-593f69c47267,query:(language:kuery,query:\'airline:"%3C%3E%3A%3B%5B%7D%5C%22)"\'))');  // eslint-disable-line max-len
    });

    it('returns expected URL for other type URL', () => {
      expect(getUrlForRecord(TEST_OTHER_URL, TEST_RECORD)).to.be('http://airlinecodes.info/airline-code-AAL');
    });

  });

  describe('isValidLabel', () => {
    const testUrls = [TEST_DASHBOARD_URL, TEST_DISCOVER_URL, TEST_OTHER_URL];
    it('returns true for a unique label', () => {
      expect(isValidLabel('Drilldown dashboard', testUrls)).to.be(true);
    });

    it('returns false for a duplicate label', () => {
      expect(isValidLabel('Show dashboard', testUrls)).to.be(false);
    });

    it('returns false for a blank label', () => {
      expect(isValidLabel('', testUrls)).to.be(false);
    });

  });

  describe('isValidTimeRange', () => {
    it('returns true for valid values', () => {
      expect(isValidTimeRange('1h')).to.be(true);
      expect(isValidTimeRange('6h')).to.be(true);
      expect(isValidTimeRange('5m')).to.be(true);
      expect(isValidTimeRange('auto')).to.be(true);
      expect(isValidTimeRange('')).to.be(true);
    });

    it('returns false for invalid values', () => {
      expect(isValidTimeRange('1hour')).to.be(false);
      expect(isValidTimeRange('uato')).to.be(false);
      expect(isValidTimeRange('AUTO')).to.be(false);
    });

  });

});
