/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { ElementSpec } from '../../../../../types';
import { ElementMenu } from '../element_menu.component';

const testElements: { [key: string]: ElementSpec } = {
  areaChart: {
    name: 'areaChart',
    displayName: 'Area chart',
    help: 'A line chart with a filled body',
    type: 'chart',
    expression: `kibana
    | selectFilter
    | demodata
    | pointseries x="time" y="mean(price)"
    | plot defaultStyle={seriesStyle lines=1 fill=1}
    | render`,
  },
  debug: {
    name: 'debug',
    displayName: 'Debug data',
    help: 'Just dumps the configuration of the element',
    icon: 'bug',
    expression: `demodata
  | render as=debug`,
  },
  dropdownFilter: {
    name: 'dropdownFilter',
    displayName: 'Dropdown select',
    type: 'filter',
    help: 'A dropdown from which you can select values for an "exactly" filter',
    icon: 'filter',
    height: 50,
    expression: `demodata
  | dropdownControl valueColumn=project filterColumn=project | render`,
    filter: '',
  },
  filterDebug: {
    name: 'filterDebug',
    displayName: 'Debug filter',
    help: 'Shows the underlying global filters in a workpad',
    icon: 'bug',
    expression: `kibana
  | selectFilter
  | render as=debug`,
  },
  image: {
    name: 'image',
    displayName: 'Image',
    help: 'A static image',
    type: 'image',
    expression: `image dataurl=null mode="contain"
  | render`,
  },
  markdown: {
    name: 'markdown',
    displayName: 'Text',
    type: 'text',
    help: 'Add text using Markdown',
    icon: 'visText',
    expression: `kibana
| selectFilter
| demodata
| markdown "### Welcome to the Markdown element

Good news! You're already connected to some demo data!

The data table contains
**{{rows.length}} rows**, each containing
the following columns:
{{#each columns}}
**{{name}}**
{{/each}}

You can use standard Markdown in here, but you can also access your piped-in data using Handlebars. If you want to know more, check out the [Handlebars documentation](https://ela.st/handlebars-docs).

#### Enjoy!" | render`,
  },
  progressGauge: {
    name: 'progressGauge',
    displayName: 'Gauge',
    type: 'progress',
    help: 'Displays progress as a portion of a gauge',
    width: 200,
    height: 200,
    icon: 'visGoal',
    expression: `kibana
  | selectFilter
  | demodata
  | math "mean(percent_uptime)"
  | progress shape="gauge" label={formatnumber 0%} font={font size=24 family="Helvetica" color="#000000" align=center}
  | render`,
  },
  shape: {
    name: 'shape',
    displayName: 'Shape',
    type: 'shape',
    help: 'A customizable shape',
    width: 200,
    height: 200,
    icon: 'node',
    expression:
      'shape "square" fill="#4cbce4" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false | render',
  },
  table: {
    name: 'table',
    displayName: 'Data table',
    type: 'chart',
    help: 'A scrollable grid for displaying data in a tabular format',
    expression: `kibana
  | selectFilter
  | demodata
  | table
  | render`,
  },
  timeFilter: {
    name: 'timeFilter',
    displayName: 'Time filter',
    type: 'filter',
    help: 'Set a time window',
    icon: 'calendar',
    height: 50,
    expression: `timefilterControl compact=true column=@timestamp
  | render`,
    filter: 'timefilter column=@timestamp from=now-24h to=now',
  },
};

storiesOf('components/WorkpadHeader/ElementMenu', module).add('default', () => (
  <ElementMenu elements={testElements} addElement={action('addElement')} />
));
