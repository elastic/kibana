/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import { DropdownFilter } from '../dropdown_filter';

const choices: Array<[string, string]> = [
  ['1', 'Item One'],
  ['2', 'Item Two'],
  ['3', 'Item Three'],
];

export default {
  title: 'renderers/DropdownFilter',
};

export const Default = {
  render: () => <DropdownFilter commit={action('commit')} />,
  name: 'default',
};

export const WithNewValue = {
  render: () => <DropdownFilter commit={action('commit')} initialValue="selectedValue" />,

  name: 'with new value',
};

export const WithChoices = {
  render: () => <DropdownFilter commit={action('commit')} choices={choices} />,
  name: 'with choices',
};

export const WithChoicesAndValue = {
  render: () => (
    <DropdownFilter commit={action('commit')} choices={choices} initialValue="Item Two" />
  ),

  name: 'with choices and value',
};

export const WithChoicesAndNewValue = {
  render: () => (
    <DropdownFilter commit={action('commit')} choices={choices} initialValue="selectedValue" />
  ),

  name: 'with choices and new value',
};
