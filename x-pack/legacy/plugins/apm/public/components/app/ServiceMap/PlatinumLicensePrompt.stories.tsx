/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { PlatinumLicensePrompt } from './PlatinumLicensePrompt';
import {
  ApmPluginContext,
  ApmPluginContextValue
} from '../../../context/ApmPluginContext';

storiesOf('app/ServiceMap/PlatinumLicensePrompt', module).add(
  'example',
  () => {
    const contextMock = ({
      core: { http: { basePath: { prepend: () => {} } } }
    } as unknown) as ApmPluginContextValue;

    return (
      <ApmPluginContext.Provider value={contextMock}>
        <PlatinumLicensePrompt />
      </ApmPluginContext.Provider>
    );
  },
  {
    info: {
      source: false
    }
  }
);
