/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { AndOrBadge } from '..';

storiesOf('components/AndOrBadge', module)
  .add('and', () => <AndOrBadge type="and" />)
  .add('or', () => <AndOrBadge type="or" />);
