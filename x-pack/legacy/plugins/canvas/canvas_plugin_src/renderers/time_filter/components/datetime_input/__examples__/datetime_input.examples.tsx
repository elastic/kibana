/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import moment from 'moment';
import React from 'react';
import { DatetimeInput } from '..';

storiesOf('renderers/TimeFilter/components/DatetimeInput', module)
  .add('default', () => <DatetimeInput setMoment={action('setMoment')} />)
  .add('with date', () => (
    <DatetimeInput moment={moment.utc('2018-02-20 19:26:52')} setMoment={action('setMoment')} />
  ))
  .add('invalid date', () => (
    <DatetimeInput moment={moment('foo')} setMoment={action('setMoment')} />
  ));
