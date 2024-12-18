/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { pie } from '..';
import { Render } from '../../__stories__/render';

const pieOptions = {
  canvas: false,
  colors: ['#882E72', '#B178A6', '#D6C1DE'],
  grid: { show: false },
  legend: { show: false },
  series: {
    pie: {
      show: true,
      innerRadius: 0,
      label: { show: true, radius: 1 },
      radius: 'auto' as 'auto',
      stroke: { width: 0 },
      tilt: 1,
    },
  },
};

const data = [
  {
    data: [10],
    label: 'A',
  },
  {
    data: [10],
    label: 'B',
  },
  {
    data: [10],
    label: 'C',
  },
];

storiesOf('renderers/pie', module)
  .add('default', () => {
    const config = {
      data,
      options: pieOptions,
      font: {
        css: '',
        spec: {},
        type: 'style' as 'style',
      },
    };
    return <Render renderer={pie} config={config} />;
  })
  .add('with legend', () => {
    const options = {
      ...pieOptions,
      legend: { show: true },
    };

    const config = {
      data,
      options,
      font: {
        css: '',
        spec: {},
        type: 'style' as 'style',
      },
    };

    return <Render renderer={pie} config={config} />;
  });
