/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { Decorator } from '@storybook/react';

export const routerContextDecorator: Decorator = (story) => (
  <MemoryRouter initialEntries={['/']}>{story()}</MemoryRouter>
);
