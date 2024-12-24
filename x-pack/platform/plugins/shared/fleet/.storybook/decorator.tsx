/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DecoratorFn } from '@storybook/react';

import { StorybookContext } from './context';

export const decorator: DecoratorFn = (story, storybook) => {
  return <StorybookContext storyContext={storybook}>{story()}</StorybookContext>;
};
