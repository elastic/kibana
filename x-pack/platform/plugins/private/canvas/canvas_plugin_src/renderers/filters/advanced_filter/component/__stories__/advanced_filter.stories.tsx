/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { AdvancedFilter } from '../advanced_filter';

storiesOf('renderers/AdvancedFilter', module)
  .add('default', () => <AdvancedFilter onChange={action('onChange')} commit={action('commit')} />)
  .add('with value', () => (
    <AdvancedFilter onChange={action('onChange')} commit={action('commit')} value="expression" />
  ));
