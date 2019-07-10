/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { AutoSizer } from '..';

storiesOf('components/AutoSizer', module).add('example', () => (
  <div>
    <AutoSizer>
      {({ measureRef, content }) => (
        <div ref={measureRef} style={{ border: '1px solid tomato' }}>
          <div>
            {'width: '}
            {content.width}
          </div>
          <div>
            {'height: '}
            {content.height}
          </div>
        </div>
      )}
    </AutoSizer>
  </div>
));
