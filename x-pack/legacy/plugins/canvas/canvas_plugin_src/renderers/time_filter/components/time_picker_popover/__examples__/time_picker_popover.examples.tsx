/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import moment from 'moment';
import React from 'react';
import { TimePickerPopover } from '..';

const startDate = moment.utc('2019-05-04').toISOString();
const endDate = moment.utc('2019-06-04').toISOString();

storiesOf('renderers/TimeFilter/components/TimePickerPopover', module).add('default', () => (
  <TimePickerPopover from={startDate} to={endDate} onSelect={action('onSelect')} />
));
