/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { generateFilterAggs } from '../generate_filter_aggs';

describe('generateFilterAggs', () => {
  it('generates expected aggregations object', () => {
    expect(
      generateFilterAggs(
        [
          { aggName: 'locations', filterName: 'locations', field: 'observer.geo.name' },
          { aggName: 'ports', filterName: 'ports', field: 'url.port' },
          { aggName: 'schemes', filterName: 'schemes', field: 'monitor.type' },
          { aggName: 'tags', filterName: 'tags', field: 'tags' },
        ],
        {
          locations: ['fairbanks', 'us-east-2'],
          ports: ['80', '5601'],
          tags: ['api'],
          schemes: ['http', 'tcp'],
        }
      )
    ).toMatchSnapshot();
  });
});
