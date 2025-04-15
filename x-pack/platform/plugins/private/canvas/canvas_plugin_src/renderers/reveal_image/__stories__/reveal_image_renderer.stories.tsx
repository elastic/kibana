/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import { Render } from '@kbn/presentation-util-plugin/public/__stories__';
import type { Meta } from '@storybook/react';
import { elasticOutline, elasticLogo } from '../../../../public/lib';
import { getRevealImageRenderer } from '..';

enum Origin {
  TOP = 'top',
  LEFT = 'left',
  BOTTOM = 'bottom',
  RIGHT = 'right',
}

const Renderer = () => {
  const config = {
    image: elasticLogo,
    emptyImage: elasticOutline,
    origin: Origin.BOTTOM,
    percent: 0.45,
  };

  return <Render renderer={getRevealImageRenderer(coreMock.createStart())} config={config} />;
};

export default {
  title: 'renderers/revealImage',
};

export const Default = {
  render: (_, props) => <Renderer />,

  name: 'default',
} as Meta;
