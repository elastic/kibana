/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import moment from 'moment';
import React from 'react';
import { DatetimeCalendar } from '..';

const startDate = moment.utc('2019-06-27');
const endDate = moment.utc('2019-07-04');

storiesOf('renderers/TimeFilter/components/DatetimeCalendar', module)
  .add('default', () => (
    <DatetimeCalendar onSelect={action('onSelect')} onValueChange={action('onValueChange')} />
  ))
  .add('with value', () => (
    <DatetimeCalendar
      value={startDate}
      onSelect={action('onSelect')}
      onValueChange={action('onValueChange')}
    />
  ))
  .add('with start and end date', () => (
    <DatetimeCalendar
      startDate={startDate}
      endDate={endDate}
      onSelect={action('onSelect')}
      onValueChange={action('onValueChange')}
    />
  ))
  .add('with min date', () => (
    <DatetimeCalendar
      onSelect={action('onSelect')}
      onValueChange={action('onValueChange')}
      minDate={endDate}
    />
  ))
  .add('with max date', () => (
    <DatetimeCalendar
      onSelect={action('onSelect')}
      onValueChange={action('onValueChange')}
      maxDate={endDate}
    />
  ))
  .add('invalid date', () => (
    <DatetimeCalendar
      value={moment('foo')}
      onSelect={action('onSelect')}
      onValueChange={action('onValueChange')}
    />
  ));
