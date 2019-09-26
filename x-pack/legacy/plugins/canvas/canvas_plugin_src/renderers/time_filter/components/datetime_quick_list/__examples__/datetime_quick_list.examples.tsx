/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { DatetimeQuickList } from '..';

storiesOf('renderers/TimeFilter/components/DatetimeQuickList', module)
  .add('with start and end dates', () => (
    <DatetimeQuickList from="now-7d" to="now" onSelect={action('onSelect')} />
  ))
  .add('with children', () => (
    <DatetimeQuickList from="now-7d" to="now" onSelect={action('onSelect')}>
      <EuiButtonEmpty>Apply</EuiButtonEmpty>
    </DatetimeQuickList>
  ));
