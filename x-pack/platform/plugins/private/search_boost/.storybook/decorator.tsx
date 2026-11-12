/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Decorator } from '@storybook/react';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';

const services = coreMock.createStart();

export const SearchBoostServicesDecorator: Decorator = (Story) => (
  <KibanaContextProvider services={services}>
    <MockAppHeaderProvider>
      <Story />
    </MockAppHeaderProvider>
  </KibanaContextProvider>
);
