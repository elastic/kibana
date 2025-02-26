/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Preview } from '@storybook/react';
import { addDecorators } from './decorators';

// Import Canvas CSS
import '../public/style/index.scss';

addDecorators();

const preview: Preview = {
  parameters: {
    controls: {
      hideNoControlsWarning: true,
    },
  },
};

// eslint-disable-next-line import/no-default-export
export default preview;
