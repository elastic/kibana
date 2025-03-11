/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { Tag } from '../tag';

storiesOf('components/Tags/Tag', module)
  .add('as health', () => <Tag name="tag" />)
  .add('as health with color', () => <Tag name="tag" color="#9b3067" />)
  .add('as badge', () => <Tag name="tag" type="badge" />)
  .add('as badge with color', () => <Tag name="tag" type="badge" color="#327b53" />);
