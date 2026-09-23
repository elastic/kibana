/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFieldText } from '@elastic/eui';
import { PluginStart } from '@kbn/core-di';
import { Context, CoreStart } from '@kbn/core-di-browser';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { Container, type ServiceIdentifier } from 'inversify';
import React, { useState } from 'react';
import { ActionPoliciesApi } from '../../../services/action_policies_api';
import { RulesApi } from '../../../services/rules_api';
import { ActionPolicyFormFlyout } from './action_policy_form_flyout';

const storyContainer = new Container();

const bindStoryService = <T,>(service: ServiceIdentifier<T>, value: unknown) => {
  storyContainer.bind(service).toConstantValue(value as T);
};

bindStoryService(CoreStart('application'), {
  getUrlForApp: (appId: string, options?: { deepLinkId?: string; path?: string }) =>
    `/app/${appId}/${options?.deepLinkId ?? ''}${options?.path ?? ''}`,
});
bindStoryService(CoreStart('uiSettings'), { get: () => true });
bindStoryService(CoreStart('http'), { get: async () => [] });
bindStoryService(CoreStart('notifications'), {
  toasts: {
    addDanger: action('Show danger toast'),
  },
});
bindStoryService(CoreStart('settings'), {});
bindStoryService(CoreStart('docLinks'), { links: {} });
bindStoryService(PluginStart('kql'), {
  QueryStringInput: ({
    query,
    onChange,
    placeholder,
    dataTestSubj,
  }: {
    query: { query: string; language: string };
    onChange: (query: { query: string; language: string }) => void;
    placeholder?: string;
    dataTestSubj?: string;
  }) => (
    <EuiFieldText
      fullWidth
      value={query.query}
      placeholder={placeholder}
      data-test-subj={dataTestSubj}
      onChange={(event) => onChange({ query: event.target.value, language: 'kuery' })}
    />
  ),
});
bindStoryService(PluginStart('triggersActionsUi'), {
  getAddConnectorFlyout: () => <></>,
});
bindStoryService(RulesApi, {
  listTags: async () => ({ tags: [] }),
  listRules: async () => ({ items: [], total: 0 }),
});
bindStoryService(ActionPoliciesApi, {
  fetchRuleEventFields: async () => [],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const ActionPolicyFormFlyoutStory = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Context.Provider value={storyContainer}>
      <QueryClientProvider client={queryClient}>
        {isOpen ? (
          <ActionPolicyFormFlyout
            onClose={() => setIsOpen(false)}
            onSave={action('Create action policy')}
          />
        ) : (
          <EuiButton fill onClick={() => setIsOpen(true)}>
            Open action policy flyout
          </EuiButton>
        )}
      </QueryClientProvider>
    </Context.Provider>
  );
};

const meta: Meta<typeof ActionPolicyFormFlyoutStory> = {
  title: 'Alerting V2/Action Policy/Form Flyout',
  component: ActionPolicyFormFlyoutStory,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story:
          'Notification controls starts closed and Destination starts open. Add an Email or Slack destination to see connector creation rendered as a link to a new tab.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof ActionPolicyFormFlyoutStory>;

export const CreateMode: Story = {};
