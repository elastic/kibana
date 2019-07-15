/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { PrettyDuration } from '..';

storiesOf('renderers/TimeFilter/components/PrettyDuration', module)
  .add('with relative dates', () => <PrettyDuration from="now-7d" to="now" />)
  .add('with absolute dates', () => <PrettyDuration from="01/01/2019" to="02/01/2019" />);
