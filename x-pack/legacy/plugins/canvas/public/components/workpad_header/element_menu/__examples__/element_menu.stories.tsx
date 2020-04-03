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

const testElements: { [key: string]: ElementSpec } = {
  areaChart: {
    name: 'areaChart',
    displayName: 'Area chart',
    help: 'A line chart with a filled body',
    type: 'chart',
    expression: `filters	
    | demodata	
    | pointseries x="time" y="mean(price)"	
    | plot defaultStyle={seriesStyle lines=1 fill=1}	
    | render`,
  },
  image: {
    name: 'image',
    displayName: 'Image',
    help: 'A static image',
    type: 'image',
    expression: `image dataurl=null mode="contain"	
  | render`,
  },
  table: {
    name: 'table',
    displayName: 'Data table',
    type: 'chart',
    help: 'A scrollable grid for displaying data in a tabular format',
    expression: `filters	
  | demodata	
  | table	
  | render`,
  },
};

storiesOf('components/WorkpadHeader/ElementMenu', module).add('default', () => (
  <ElementMenu elements={testElements} addElement={action('addElement')} />
));
