/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import React from 'react';

import { CanvasVariable } from '../../../../types';

import { EditVar } from '../edit_var';

const variables: CanvasVariable[] = [
  {
    name: 'homeUrl',
    value: 'https://elastic.co',
    type: 'string',
  },
  {
    name: 'bigNumber',
    value: 1000,
    type: 'number',
  },
  {
    name: 'zenMode',
    value: true,
    type: 'boolean',
  },
];

export default {
  title: 'components/Variables/EditVar',
};

export const NewVariable = {
  render: () => (
    <EditVar
      variables={variables}
      selectedVar={null}
      onSave={action('onSave')}
      onCancel={action('onCancel')}
    />
  ),

  name: 'new variable',
};

export const EditVariableString = {
  render: () => (
    <EditVar
      variables={variables}
      selectedVar={variables[0]}
      onSave={action('onSave')}
      onCancel={action('onCancel')}
    />
  ),

  name: 'edit variable (string)',
};

export const EditVariableNumber = {
  render: () => (
    <EditVar
      variables={variables}
      selectedVar={variables[1]}
      onSave={action('onSave')}
      onCancel={action('onCancel')}
    />
  ),

  name: 'edit variable (number)',
};

export const EditVariableBoolean = {
  render: () => (
    <EditVar
      variables={variables}
      selectedVar={variables[2]}
      onSave={action('onSave')}
      onCancel={action('onCancel')}
    />
  ),

  name: 'edit variable (boolean)',
};
