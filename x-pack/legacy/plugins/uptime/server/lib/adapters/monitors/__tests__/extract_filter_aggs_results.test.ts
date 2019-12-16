/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extractFilterAggsResults } from '../extract_filter_aggs_results';
describe('extractFilterAggsResults', () => {
  it('extracts the bucket values of the expected filter fields', () => {
    expect(
      extractFilterAggsResults(
        {
          locations: {
            doc_count: 8098,
            term: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                { key: 'us-east-2', doc_count: 4050 },
                { key: 'fairbanks', doc_count: 4048 },
              ],
            },
          },
          schemes: {
            doc_count: 8098,
            term: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                { key: 'http', doc_count: 5055 },
                { key: 'tcp', doc_count: 2685 },
                { key: 'icmp', doc_count: 358 },
              ],
            },
          },
          ports: {
            doc_count: 8098,
            term: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                { key: 12349, doc_count: 3571 },
                { key: 80, doc_count: 2985 },
                { key: 5601, doc_count: 358 },
                { key: 8200, doc_count: 358 },
                { key: 9200, doc_count: 358 },
                { key: 9292, doc_count: 110 },
              ],
            },
          },
          tags: {
            doc_count: 8098,
            term: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                { key: 'api', doc_count: 8098 },
                { key: 'dev', doc_count: 8098 },
              ],
            },
          },
        },
        ['locations', 'ports', 'schemes', 'tags']
      )
    ).toMatchSnapshot();
  });
});
