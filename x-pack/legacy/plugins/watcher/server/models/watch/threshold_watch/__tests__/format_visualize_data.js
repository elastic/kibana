/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { AGG_TYPES } from '../../../../../common/constants';
import { formatVisualizeData } from '../format_visualize_data';

describe('watch', () => {
  describe('formatVisualizeData', () => {
    it('correctly formats data from a Count query', () => {
      const watch = {
        aggType: AGG_TYPES.COUNT,
        termField: undefined,
      };

      const response = {
        aggregations: {
          dateAgg: {
            buckets: [
              {
                key_as_string: '2017-06-17T00:00:00.000-05:00',
                key: 1497675600000,
                doc_count: 13622,
              },
              {
                key_as_string: '2017-06-17T12:00:00.000-05:00',
                key: 1497718800000,
                doc_count: 13639,
              },
              {
                key_as_string: '2017-06-18T00:00:00.000-05:00',
                key: 1497762000000,
                doc_count: 13811,
              },
              {
                key_as_string: '2017-06-18T12:00:00.000-05:00',
                key: 1497805200000,
                doc_count: 13461,
              },
            ],
          },
        },
      };

      const expected = {
        count: [
          [1497675600000, 13622],
          [1497718800000, 13639],
          [1497762000000, 13811],
          [1497805200000, 13461],
        ],
      };

      const actual = formatVisualizeData(watch, response);

      expect(actual).to.eql(expected);
    });

    it('correctly formats data from a Count Terms query', () => {
      const watch = {
        aggType: AGG_TYPES.COUNT,
        termField: 'foo_term_field',
      };

      const response = {
        aggregations: {
          bucketAgg: {
            buckets: [
              {
                key: 'foo_term',
                dateAgg: {
                  buckets: [
                    {
                      key: 1498366800000,
                      doc_count: 8878,
                    },
                    {
                      key: 1498410000000,
                      doc_count: 8674,
                    },
                    {
                      key: 1498453200000,
                      doc_count: 8720,
                    },
                  ],
                },
              },
              {
                key: 'bar_term',
                dateAgg: {
                  buckets: [
                    {
                      key: 1498366800000,
                      doc_count: 2163,
                    },
                    {
                      key: 1498410000000,
                      doc_count: 2202,
                    },
                    {
                      key: 1498453200000,
                      doc_count: 2311,
                    },
                  ],
                },
              },
              {
                key: 'baz_term',
                dateAgg: {
                  buckets: [
                    {
                      key: 1497675600000,
                      doc_count: 891,
                    },
                    {
                      key: 1497718800000,
                      doc_count: 866,
                    },
                    {
                      key: 1497762000000,
                      doc_count: 906,
                    },
                  ],
                },
              },
            ],
          },
        },
      };

      const expected = {
        foo_term: [[1498366800000, 8878], [1498410000000, 8674], [1498453200000, 8720]],
        bar_term: [[1498366800000, 2163], [1498410000000, 2202], [1498453200000, 2311]],
        baz_term: [[1497675600000, 891], [1497718800000, 866], [1497762000000, 906]],
      };

      const actual = formatVisualizeData(watch, response);

      expect(actual).to.eql(expected);
    });

    it('correctly formats data from a Non-Count query', () => {
      const watch = {
        aggType: AGG_TYPES.AVERAGE,
        termField: undefined,
      };

      const response = {
        aggregations: {
          dateAgg: {
            buckets: [
              {
                key: 1497675600000,
                metricAgg: {
                  value: 5721.5481573924535,
                },
              },
              {
                key: 1497718800000,
                metricAgg: {
                  value: 5696.727765965246,
                },
              },
              {
                key: 1497762000000,
                metricAgg: {
                  value: 5725.888567084208,
                },
              },
            ],
          },
        },
      };

      const expected = {
        [AGG_TYPES.AVERAGE]: [
          [1497675600000, 5721.5481573924535],
          [1497718800000, 5696.727765965246],
          [1497762000000, 5725.888567084208],
        ],
      };

      const actual = formatVisualizeData(watch, response);

      expect(actual).to.eql(expected);
    });

    it('correctly formats data from a Non-Count Terms query', () => {
      const watch = {
        aggType: AGG_TYPES.AVERAGE,
        termField: 'foo_term_field',
      };

      const response = {
        aggregations: {
          bucketAgg: {
            buckets: [
              {
                key: 'foo_term',
                dateAgg: {
                  buckets: [
                    {
                      key: 1498366800000,
                      metricAgg: {
                        value: 10741.000753579503,
                      },
                    },
                    {
                      key: 1498410000000,
                      metricAgg: {
                        value: 10350.321100917432,
                      },
                    },
                    {
                      key: 1498453200000,
                      metricAgg: {
                        value: 10534.54078549849,
                      },
                    },
                  ],
                },
                metricAgg: {
                  value: 10477.102294853963,
                },
              },
              {
                key: 'bar_term',
                dateAgg: {
                  buckets: [
                    {
                      key: 1498366800000,
                      metricAgg: {
                        value: 5629.317614424411,
                      },
                    },
                    {
                      key: 1498410000000,
                      metricAgg: {
                        value: 5548.141689373297,
                      },
                    },
                    {
                      key: 1498453200000,
                      metricAgg: {
                        value: 5603.887494591086,
                      },
                    },
                  ],
                },
                metricAgg: {
                  value: 5595.034518438806,
                },
              },
              {
                key: 'baz_term',
                dateAgg: {
                  buckets: [
                    {
                      key: 1498366800000,
                      metricAgg: {
                        value: 5577.867537733724,
                      },
                    },
                    {
                      key: 1498410000000,
                      metricAgg: {
                        value: 5543.652870647913,
                      },
                    },
                    {
                      key: 1498453200000,
                      metricAgg: {
                        value: 5553.1327981651375,
                      },
                    },
                  ],
                },
                metricAgg: {
                  value: 5567.288459750643,
                },
              },
            ],
          },
        },
      };

      const expected = {
        foo_term: [
          [1498366800000, 10741.000753579503],
          [1498410000000, 10350.321100917432],
          [1498453200000, 10534.54078549849],
        ],
        bar_term: [
          [1498366800000, 5629.317614424411],
          [1498410000000, 5548.141689373297],
          [1498453200000, 5603.887494591086],
        ],
        baz_term: [
          [1498366800000, 5577.867537733724],
          [1498410000000, 5543.652870647913],
          [1498453200000, 5553.1327981651375],
        ],
      };

      const actual = formatVisualizeData(watch, response);

      expect(actual).to.eql(expected);
    });
  });
});
