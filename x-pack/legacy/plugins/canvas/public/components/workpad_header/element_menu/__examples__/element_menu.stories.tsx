/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { ElementMenu } from '../element_menu';
import { ElementSpec } from '../../../../../types';

const testElements: { [key: string]: ElementSpec } = {};

storiesOf('components/WorkpadHeader/ElementMenu', module).add('default', () => (
  <ElementMenu elements={testElements} addElement={action('addElement')} />
));
