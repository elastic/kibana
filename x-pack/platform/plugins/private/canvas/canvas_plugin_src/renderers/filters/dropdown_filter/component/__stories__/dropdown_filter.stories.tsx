/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { DropdownFilter } from '../dropdown_filter';

const choices: Array<[string, string]> = [
  ['1', 'Item One'],
  ['2', 'Item Two'],
  ['3', 'Item Three'],
];

storiesOf('renderers/DropdownFilter', module)
  .add('default', () => <DropdownFilter commit={action('commit')} />)
  .add('with new value', () => (
    <DropdownFilter commit={action('commit')} initialValue="selectedValue" />
  ))
  .add('with choices', () => <DropdownFilter commit={action('commit')} choices={choices} />)
  .add('with choices and value', () => (
    <DropdownFilter commit={action('commit')} choices={choices} initialValue="Item Two" />
  ))
  .add('with choices and new value', () => (
    <DropdownFilter commit={action('commit')} choices={choices} initialValue="selectedValue" />
  ));
