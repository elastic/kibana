/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

import { NeedLicenseUpgrade as Component } from '../need_license_upgrade';

export default {
  title: 'Layout/Call to Action/Types',
  component: Component,
  argTypes: {
    onManageLicense: { action: 'onManageLicense' },
  },
} as Meta<typeof Component>;

export const NeedLicenseUpgrade: StoryFn<typeof Component> = (args) => <Component {...args} />;
