/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps } from 'react';
import { Meta, StoryFn, StoryObj } from '@storybook/react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { RulesSettingsLink } from './rules_settings_link';
import { StorybookContextDecorator } from '../../../../.storybook/decorator';
import { getDefaultCapabilities } from '../../../../.storybook/context/capabilities';

type Args = ComponentProps<typeof RulesSettingsLink>;

export default {
  title: 'app/RulesSettingsLink',
  component: RulesSettingsLink,
} as Meta<Args>;

const Template: StoryFn<Args> = ({ alertDeleteCategoryIds }) => {
  return <RulesSettingsLink alertDeleteCategoryIds={alertDeleteCategoryIds} />;
};

export const withAllPermission: StoryObj<Args> = {
  render: Template,
  args: {
    alertDeleteCategoryIds: ['management'],
  },
  decorators: [
    (StoryComponent, context) => (
      <StorybookContextDecorator
        context={context}
        servicesApplicationOverride={{
          capabilities: getDefaultCapabilities({
            rulesSettings: {
              show: true,
              save: true,
              readFlappingSettingsUI: true,
              writeFlappingSettingsUI: true,
              readQueryDelaySettingsUI: true,
              writeQueryDelaySettingsUI: true,
            },
          }),
        }}
      >
        <StoryComponent />
      </StorybookContextDecorator>
    ),
  ],
};

export const withReadPermission: StoryObj<Args> = {
  render: Template,

  decorators: [
    (StoryComponent, context) => (
      <StorybookContextDecorator
        context={context}
        servicesApplicationOverride={{
          capabilities: getDefaultCapabilities({
            rulesSettings: {
              show: true,
              save: false,
              readFlappingSettingsUI: true,
              writeFlappingSettingsUI: false,
              readQueryDelaySettingsUI: true,
              writeQueryDelaySettingsUI: false,
            },
          }),
        }}
      >
        <StoryComponent />
      </StorybookContextDecorator>
    ),
  ],
};

export const withNoPermission: StoryObj<Args> = {
  render: Template,

  decorators: [
    (StoryComponent, context) => (
      <StorybookContextDecorator
        context={context}
        servicesApplicationOverride={{
          capabilities: getDefaultCapabilities({
            rulesSettings: {
              show: false,
              save: false,
              readFlappingSettingsUI: false,
              writeFlappingSettingsUI: false,
              readQueryDelaySettingsUI: false,
              writeQueryDelaySettingsUI: false,
            },
          }),
        }}
      >
        <EuiCallOut title="No Permissions">
          When the user does not have capabilities to view rules settings, the entire link is hidden
        </EuiCallOut>
        <EuiSpacer />
        <StoryComponent />
      </StorybookContextDecorator>
    ),
  ],
};
