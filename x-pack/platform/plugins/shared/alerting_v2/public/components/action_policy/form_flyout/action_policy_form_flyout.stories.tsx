/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFieldText,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
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

const StoryEnvironment = ({ children }: { children: React.ReactNode }) => (
  <Context.Provider value={storyContainer}>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </Context.Provider>
);

const ActionPolicyFormFlyoutStory = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <StoryEnvironment>
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
    </StoryEnvironment>
  );
};

const PARENT_FLYOUT_TITLE_ID = 'actionPolicyParentFlyoutTitle';

const NestedActionPolicyFormFlyoutStory = () => {
  const [isParentOpen, setIsParentOpen] = useState(true);
  const [isActionPolicyOpen, setIsActionPolicyOpen] = useState(false);

  const closeParentFlyout = () => {
    setIsActionPolicyOpen(false);
    setIsParentOpen(false);
  };

  return (
    <StoryEnvironment>
      {isParentOpen ? (
        <EuiFlyout
          ownFocus
          size={540}
          minWidth={480}
          resizable
          session="start"
          onClose={closeParentFlyout}
          aria-labelledby={PARENT_FLYOUT_TITLE_ID}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={PARENT_FLYOUT_TITLE_ID}>Create rule</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiText>
              <p>
                This flyout represents the Rule Form. Open the Action Policy Form without closing
                it.
              </p>
            </EuiText>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiButton fill onClick={() => setIsActionPolicyOpen(true)}>
              Create action policy
            </EuiButton>
          </EuiFlyoutFooter>
          {isActionPolicyOpen && (
            <ActionPolicyFormFlyout
              onClose={() => setIsActionPolicyOpen(false)}
              onSave={action('Create action policy from rule form')}
            />
          )}
        </EuiFlyout>
      ) : (
        <EuiButton fill onClick={() => setIsParentOpen(true)}>
          Open rule form flyout
        </EuiButton>
      )}
    </StoryEnvironment>
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

export const OpenedFromRuleFormFlyout: Story = {
  render: () => <NestedActionPolicyFormFlyoutStory />,
  parameters: {
    docs: {
      description: {
        story:
          'Opens the Action Policy Form as a child of a Rule Form flyout while keeping the parent flyout mounted.',
      },
    },
  },
};
