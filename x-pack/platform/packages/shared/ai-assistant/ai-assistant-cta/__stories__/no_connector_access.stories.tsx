/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentMeta, ComponentStory } from '@storybook/react';

import { NoConnectorAccess as Component } from '../no_connector_access';

export default {
  title: 'Layout/Call to Action/Types',
  component: Component,
} as ComponentMeta<typeof Component>;

export const NoConnectorAccess: ComponentStory<typeof Component> = () => <Component />;
