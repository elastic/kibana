import expect from 'expect.js';
import ngMock from 'ng_mock';
import { getHighlightRequestProvider } from '../highlight_request';

describe('getHighlightRequest', () => {
  const queryStringQuery = { query_string: { query: 'foo' } };
  const queryStringWithDefaultFieldQuery = { query_string: { query: 'foo', default_field: 'bar' } };
  const queryStringWithFieldQuery = { query_string: { query: 'foo', fields: ['bar'] } };
  const rangeQuery = { range: { '@timestamp': { gte: 0, lte: 0 } } };
  const boolQueryWithSingleCondition = {
    bool: {
      must: queryStringQuery,
    }
  };
  const boolQueryWithMultipleConditions = {
    bool: {
      must: [
        queryStringQuery,
        rangeQuery
      ]
    }
  };

  let config;
  let previousHighlightConfig;
  let previousAllFieldsConfig;
  let getHighlightRequest;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (_config_) {
    config = _config_;
    previousHighlightConfig = config.get('doc_table:highlight');
    previousAllFieldsConfig = config.get('doc_table:highlight:all_fields');
  }));

  afterEach(() => {
    config.set('doc_table:highlight', previousHighlightConfig);
    config.set('doc_table:highlight:all_fields', previousAllFieldsConfig);
  });

  it('should be a function', () => {
    getHighlightRequest = getHighlightRequestProvider(config);
    expect(getHighlightRequest).to.be.a(Function);
  });

  it('should add the all_fields param with query_string query without modifying original query', () => {
    getHighlightRequest = getHighlightRequestProvider(config);
    const request = getHighlightRequest(queryStringQuery);
    expect(request.fields['*']).to.have.property('highlight_query');
    expect(request.fields['*'].highlight_query.query_string).to.have.property('all_fields');
    expect(queryStringQuery.query_string).to.not.have.property('all_fields');
  });

  it('should add the all_fields param with bool query with single condition without modifying original query', () => {
    getHighlightRequest = getHighlightRequestProvider(config);
    const request = getHighlightRequest(boolQueryWithSingleCondition);
    expect(request.fields['*']).to.have.property('highlight_query');
    expect(request.fields['*'].highlight_query.bool.must.query_string).to.have.property('all_fields');
    expect(queryStringQuery.query_string).to.not.have.property('all_fields');
  });

  it('should add the all_fields param with bool query with multiple conditions without modifying original query', () => {
    getHighlightRequest = getHighlightRequestProvider(config);
    const request = getHighlightRequest(boolQueryWithMultipleConditions);
    expect(request.fields['*']).to.have.property('highlight_query');
    expect(request.fields['*'].highlight_query.bool.must).to.have.length(boolQueryWithMultipleConditions.bool.must.length);
    expect(request.fields['*'].highlight_query.bool.must[0].query_string).to.have.property('all_fields');
    expect(queryStringQuery.query_string).to.not.have.property('all_fields');
  });

  it('should return undefined if highlighting is turned off', () => {
    config.set('doc_table:highlight', false);
    getHighlightRequest = getHighlightRequestProvider(config);
    const request = getHighlightRequest(queryStringQuery);
    expect(request).to.be(undefined);
  });

  it('should not add the highlight_query param if all_fields is turned off', () => {
    config.set('doc_table:highlight:all_fields', false);
    getHighlightRequest = getHighlightRequestProvider(config);
    const request = getHighlightRequest(queryStringQuery);
    expect(request.fields['*']).to.not.have.property('highlight_query');
  });

  it('should enable/disable highlighting if config is changed', () => {
    getHighlightRequest = getHighlightRequestProvider(config);
    let request = getHighlightRequest(queryStringQuery);
    expect(request).to.not.be(undefined);

    config.set('doc_table:highlight', false);
    request = getHighlightRequest(queryStringQuery);
    expect(request).to.be(undefined);
  });

  it('should not add the all_fields param with query_string query when default_field is specified', () => {
    getHighlightRequest = getHighlightRequestProvider(config);
    const request = getHighlightRequest(queryStringWithDefaultFieldQuery);
    expect(request.fields['*']).to.have.property('highlight_query');
    expect(request.fields['*'].highlight_query.query_string).to.have.property('default_field');
    expect(request.fields['*'].highlight_query.query_string).to.not.have.property('all_fields');
    expect(queryStringQuery.query_string).to.not.have.property('all_fields');
  });

  it('should not add the all_fields param with query_string query when fields are specified', () => {
    getHighlightRequest = getHighlightRequestProvider(config);
    const request = getHighlightRequest(queryStringWithFieldQuery);
    expect(request.fields['*']).to.have.property('highlight_query');
    expect(request.fields['*'].highlight_query.query_string).to.have.property('fields');
    expect(request.fields['*'].highlight_query.query_string).to.not.have.property('all_fields');
    expect(queryStringQuery.query_string).to.not.have.property('all_fields');
  });
});
