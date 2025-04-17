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
import { elasticLogo, elasticOutline } from '../../../../public/lib';
import { getRepeatImageRenderer } from '..';

const Renderer = () => {
  const config = {
    count: 42,
    image: elasticLogo,
    size: 20,
    max: 60,
    emptyImage: elasticOutline,
  };

  return (
    <Render
      renderer={getRepeatImageRenderer(coreMock.createStart())}
      config={config}
      width="400px"
    />
  );
};

export default {
  title: 'enderers/repeatImage',
};

export const Default = {
  render: (_, props) => <Renderer />,

  name: 'default',
} as Meta;
