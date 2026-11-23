/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Global } from '@emotion/react';
import type { Decorator } from '@storybook/react';
import { useEuiTheme } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';

const services = coreMock.createStart();

// Management shows the app on a plain page, not on EUI's body color.
const PlainPageBackground = () => {
  const { euiTheme } = useEuiTheme();
  return <Global styles={{ html: { backgroundColor: euiTheme.colors.backgroundBasePlain } }} />;
};

export const SearchBoostServicesDecorator: Decorator = (Story) => (
  <KibanaContextProvider services={services}>
    <MockAppHeaderProvider>
      <PlainPageBackground />
      <Story />
    </MockAppHeaderProvider>
  </KibanaContextProvider>
);
