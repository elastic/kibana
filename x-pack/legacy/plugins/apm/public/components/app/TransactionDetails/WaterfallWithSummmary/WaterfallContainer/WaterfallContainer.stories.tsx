/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { WaterfallContainer } from './index';
import {
  location,
  urlParams,
  simpleWaterfall,
  waterfallWithErrors,
  waterfallChildStartBeforeParent
} from './waterfallContainer.stories.data';

storiesOf('app/Transaction/Waterfall', module).add('simple', () => {
  return (
    <WaterfallContainer
      location={location}
      urlParams={urlParams}
      waterfall={simpleWaterfall}
      exceedsMax={false}
    />
  );
});

storiesOf('app/Transaction/Waterfall', module).add('with errors', () => {
  return (
    <WaterfallContainer
      location={location}
      urlParams={urlParams}
      waterfall={waterfallWithErrors}
      exceedsMax={false}
    />
  );
});

storiesOf('app/Transaction/Waterfall', module).add(
  'child starts before parent',
  () => {
    return (
      <WaterfallContainer
        location={location}
        urlParams={urlParams}
        waterfall={waterfallChildStartBeforeParent}
        exceedsMax={false}
      />
    );
  }
);
