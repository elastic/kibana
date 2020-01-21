/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../../../../test_utils';
import { HighlightDetailsFlyout, Props } from '.';

describe('Highlight Details Flyout', () => {
  it('renders', async () => {
    const props: Props = {
      onClose: () => {},
      shardName: '[test][test]',
      operation: {
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
        lucene: 'test',
        query_type: 'test',
        selfTime: 100,
        time: 100,
        timePercentage: '100',
        hasChildren: false,
        visible: true,
        absoluteColor: '123',
      },
      indexName: 'test',
    };

    const init = registerTestBed(HighlightDetailsFlyout);
    await init(props);
  });
});
