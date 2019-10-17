/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../../../../test_utils';
import { HighlightDetails, Props } from '.';

describe('Highlight Details Component', () => {
  it('renders', async () => {
    const props: Props = {
      breakdown: [
        {
          color: 'test',
          key: 'test',
          relative: 100,
          tip: 'test',
          time: 100,
        },
        {
          color: 'test',
          key: 'test',
          relative: 100,
          tip: 'test',
          time: 100,
        },
        {
          color: 'test',
          key: 'test',
          relative: 100,
          tip: 'test',
          time: 100,
        },
      ],
      indexName: 'test',
      lucene: 'test',
      queryType: 'test',
      shardID: 'test',
      selfTime: 100,
      shardNumber: 'test',
      time: 100,
    };

    const init = registerTestBed(HighlightDetails);
    await init(props);
  });
});
