/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Preview } from '@storybook/react';

// Import Canvas CSS
import '../public/style/index.scss';
import { kibanaContextDecorator } from './decorators/kibana_decorator';
import { routerContextDecorator } from './decorators/router_decorator';
import { legacyContextDecorator, servicesContextDecorator } from './decorators/services_decorator';

if (process.env.NODE_ENV === 'test') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('babel-plugin-require-context-hook/register')();
}

const preview: Preview = {
  parameters: {
    controls: {
      hideNoControlsWarning: true,
    },
  },
  decorators: [
    kibanaContextDecorator,
    routerContextDecorator,
    legacyContextDecorator(),
    servicesContextDecorator(),
  ],
};

// eslint-disable-next-line import/no-default-export
export default preview;
