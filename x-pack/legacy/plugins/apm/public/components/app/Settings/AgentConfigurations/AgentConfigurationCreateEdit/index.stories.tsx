/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { AgentConfigurationCreateEdit } from './index';
import {
  ApmPluginContext,
  ApmPluginContextValue
} from '../../../../../context/ApmPluginContext';

storiesOf(
  'app/Settings/AgentConfigurations/AgentConfigurationCreateEdit',
  module
).add(
  'selectedConfig=null',
  () => {
    const contextMock = ({
      core: { notifications: { toasts: {} } }
    } as unknown) as ApmPluginContextValue;

    return (
      <ApmPluginContext.Provider value={contextMock}>
        <AgentConfigurationCreateEdit />
      </ApmPluginContext.Provider>
    );
  },
  {
    info: {
      source: false
    }
  }
);
