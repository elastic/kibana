/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addDecorator } from '@storybook/react';
import { routerContextDecorator } from './router_decorator';
import { kibanaContextDecorator } from './kibana_decorator';
import { servicesContextDecorator, legacyContextDecorator } from './services_decorator';

export { reduxDecorator } from './redux_decorator';
export { servicesContextDecorator } from './services_decorator';

export const addDecorators = () => {
  if (process.env.NODE_ENV === 'test') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('babel-plugin-require-context-hook/register')();
  }

  addDecorator(kibanaContextDecorator);
  addDecorator(routerContextDecorator);
  addDecorator(legacyContextDecorator());
  addDecorator(servicesContextDecorator());
};
