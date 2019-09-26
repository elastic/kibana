/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { TimeFilter } from '..';

storiesOf('renderers/TimeFilter', module)
  .add('default', () => (
    <TimeFilter
      filter="timefilter from=now-1y to=now-7d column=@timestamp"
      commit={action('commit')}
    />
  ))
  .add('compact mode', () => (
    <TimeFilter
      filter="timefilter from=now-7d to=now column=@timestamp"
      compact
      commit={action('commit')}
    />
  ));
