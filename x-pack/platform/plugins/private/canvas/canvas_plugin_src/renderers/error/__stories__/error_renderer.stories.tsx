/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Render } from '@kbn/presentation-util-plugin/public/__stories__';
import { coreMock } from '@kbn/core/public/mocks';
import { getErrorRenderer } from '../error_renderer';

export default {
  title: 'renderers/error',
};

export const Default = {
  render: () => {
    const thrownError = new Error('There was an error');
    const config = {
      error: thrownError,
    };
    return <Render renderer={getErrorRenderer(coreMock.createStart())} config={config} />;
  },

  name: 'default',
};
